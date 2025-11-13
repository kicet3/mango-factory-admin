import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Editor, Frame, Element, useNode } from '@craftjs/core';
import { Layers } from '@craftjs/layers';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { reactCodeToCraft, craftNodeMapToString } from '@/lib/reactToCraft';

// Game 설정 패널 (먼저 정의)
function GameSettings() {
  const {
    actions: { setProp },
    data,
  } = useNode((node) => ({
    data: node.data.props.data,
  }));

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold">Game 설정</h3>
      <div className="space-y-2">
        <label className="text-sm font-medium">JSON 데이터</label>
        <textarea
          className="w-full h-40 p-2 border rounded text-xs font-mono"
          value={JSON.stringify(data.jsonData, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              setProp((props: any) => {
                props.data.jsonData = parsed;
              }, 500);
            } catch (err) {
              // 파싱 오류 무시
            }
          }}
        />
      </div>
    </div>
  );
}

// Craft.js 호환 컴포넌트 래퍼
const CraftContainer = ({ children, ...props }: any) => {
  const {
    connectors: { connect, drag },
    selected,
    actions: { setProp },
  } = useNode((state) => ({
    selected: state.events.selected,
  }));

  return (
    <div
      ref={(ref) => ref && connect(drag(ref))}
      className={`${selected ? 'ring-2 ring-blue-500' : ''}`}
      {...props}
    >
      {children}
    </div>
  );
};

CraftContainer.craft = {
  displayName: 'Container',
  props: {},
  rules: {
    canDrag: () => true,
    canDrop: () => true,
  },
};

// 편집 가능한 Game 컴포넌트 래퍼
const EditableGame = ({ data }: any) => {
  const {
    connectors: { connect, drag },
    selected,
  } = useNode((state) => ({
    selected: state.events.selected,
  }));

  // 실제 Game 컴포넌트 코드 실행
  const GameComponent = React.useMemo(() => {
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function('React', 'data', `
        const { useState, useEffect, useRef } = React;
        ${data.componentCode}
        return Game;
      `);
      return fn(React, data);
    } catch (error) {
      console.error('Game component error:', error);
      return () => <div>컴포넌트 로드 오류</div>;
    }
  }, [data.componentCode]);

  return (
    <div
      ref={(ref) => ref && connect(drag(ref))}
      className={`${selected ? 'ring-4 ring-blue-500' : ''}`}
    >
      <GameComponent data={data.jsonData} />
    </div>
  );
};

EditableGame.craft = {
  displayName: 'Game',
  props: {
    data: {
      componentCode: '',
      jsonData: {},
    },
  },
  related: {
    settings: GameSettings,
  },
};

export default function CraftJsEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(true);
  const [conversionData, setConversionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [jsonData, setJsonData] = useState<any>({});
  const [componentCode, setComponentCode] = useState('');

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

  const getAuthHeaders = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    return headers;
  };

  // 데이터 로드 및 React 코드를 GUI로 자동 변환
  useEffect(() => {
    const loadData = async () => {
      if (!id || id === 'new') {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const headers = await getAuthHeaders();

        const response = await fetch(`${API_BASE_URL}/conversions/${id}`, {
          method: 'GET',
          headers,
          mode: 'cors',
        });

        if (!response.ok) {
          throw new Error(`서버 오류: ${response.status}`);
        }

        const data = await response.json();
        setConversionData(data);

        // 첫 번째 컴포넌트와 슬라이드 로드
        if (data.components && data.components.length > 0) {
          const code = data.components[0].code;
          setComponentCode(code);

          // React 코드를 Craft.js GUI로 자동 변환
          try {
            console.log('🔄 React 코드를 GUI로 변환 중...');
            const craftNodes = reactCodeToCraft(code);
            const serialized = craftNodeMapToString(craftNodes);

            // Note: 에디터가 마운트된 후에 로드해야 함
            // actions는 Editor 컨텍스트 내부에서만 접근 가능
            (window as any).__craftInitialState = serialized;

            console.log('✅ Craft.js 초기 상태 준비 완료');
          } catch (error) {
            console.error('⚠️ GUI 변환 실패, 기본 에디터 사용:', error);
          }
        }

        if (data.slides && data.slides.length > 0) {
          setJsonData(data.slides[0].data);
        }

        toast.success('데이터를 불러왔습니다');
      } catch (error: any) {
        console.error('데이터 로드 실패:', error);
        toast.error('데이터를 불러오는데 실패했습니다');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  // 저장
  const handleSave = async (query: any) => {
    try {
      const json = query.serialize();
      const headers = await getAuthHeaders();

      // Craft.js 상태를 백엔드에 저장
      const response = await fetch(`${API_BASE_URL}/conversions/${id}/editor-state`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          editor_state: json,
          json_data: jsonData,
        }),
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`저장 실패: ${response.status}`);
      }

      toast.success('저장되었습니다');
    } catch (error: any) {
      console.error('저장 오류:', error);
      toast.error(error.message || '저장 중 오류가 발생했습니다');
    }
  };


  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mango-green"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* 상단 툴바 */}
      <div className="h-14 border-b border-border bg-card px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/materials-v2')}
            className="rounded-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            목록으로
          </Button>
          <span className="text-sm font-semibold">
            {conversionData?.content_name || '자료 편집'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEnabled(!enabled)}
            className="rounded-full"
          >
            <Eye className="w-4 h-4 mr-2" />
            {enabled ? '편집 모드' : '미리보기'}
          </Button>
        </div>
      </div>

      {/* 메인 영역 */}
      <div className="flex-1 flex overflow-hidden">
        <Editor
          resolver={{
            CraftContainer,
            EditableGame,
          }}
          enabled={enabled}
          onRender={({ render }) => (
            <div className="w-full h-full">{render}</div>
          )}
          onNodesChange={(query) => {
            // 초기 상태가 있으면 로드
            const initialState = (window as any).__craftInitialState;
            if (initialState) {
              try {
                query.deserialize(initialState);
                console.log('✅ Craft.js 초기 상태 로드 완료');
                delete (window as any).__craftInitialState;
              } catch (error) {
                console.error('⚠️ 초기 상태 로드 실패:', error);
              }
            }
          }}
        >
          {/* 캔버스 영역 */}
          <div className="flex-1 overflow-auto bg-gray-100 p-8">
            <div className="bg-white shadow-2xl mx-auto" style={{ width: '1280px', height: '720px' }}>
              <Frame>
                <Element
                  is={EditableGame}
                  canvas
                  data={{
                    componentCode,
                    jsonData,
                  }}
                />
              </Frame>
            </div>
          </div>

          {/* 오른쪽 패널 */}
          <div className="w-80 border-l border-border bg-card flex flex-col">
            <Tabs defaultValue="settings" className="flex-1 flex flex-col">
              <TabsList className="w-full grid grid-cols-2 rounded-none">
                <TabsTrigger value="settings">설정</TabsTrigger>
                <TabsTrigger value="layers">레이어</TabsTrigger>
              </TabsList>

              <TabsContent value="settings" className="flex-1 overflow-auto p-4">
                <SettingsPanel />
              </TabsContent>

              <TabsContent value="layers" className="flex-1 overflow-auto p-4">
                <Layers />
              </TabsContent>
            </Tabs>

            {/* 하단 저장 버튼 */}
            <div className="p-4 border-t border-border">
              <Editor>
                {({ query }) => (
                  <Button
                    className="w-full bg-mango-green hover:bg-mango-green/90"
                    onClick={() => handleSave(query)}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    변경사항 저장
                  </Button>
                )}
              </Editor>
            </div>
          </div>
        </Editor>
      </div>
    </div>
  );
}

// 설정 패널
function SettingsPanel() {
  return (
    <div>
      <Editor>
        {({ query, selected }) => {
          const currentNodeId = selected && selected.size > 0 ? Array.from(selected)[0] : null;

          if (!currentNodeId) {
            return (
              <div className="text-center text-muted-foreground py-8">
                요소를 선택하여 설정을 편집하세요
              </div>
            );
          }

          const node = query.node(currentNodeId).get();
          const Settings = node.related?.settings;

          return Settings ? <Settings /> : <div className="p-4">설정 없음</div>;
        }}
      </Editor>
    </div>
  );
}
