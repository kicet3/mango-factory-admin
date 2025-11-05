import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Save,
  Eye,
  Code,
  Database,
  Layers,
  Settings,
  Upload,
  Download,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Play
} from 'lucide-react';
import { toast } from 'sonner';

interface ComponentNode {
  id: string;
  type: string;
  props: Record<string, any>;
  children: ComponentNode[];
  position: { x: number; y: number };
  size: { width: number; height: number };
}

interface DataBinding {
  componentId: string;
  propName: string;
  dataPath: string;
}

export default function VisualEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [materialName, setMaterialName] = useState('');
  const [materialDescription, setMaterialDescription] = useState('');
  const [reactCode, setReactCode] = useState('');
  const [jsonData, setJsonData] = useState(`{
  "shape_1": "제목을 입력하세요",
  "shape_5": "설명을 입력하세요"
}`);
  const [components, setComponents] = useState<ComponentNode[]>([]);
  const [dataBindings, setDataBindings] = useState<DataBinding[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const parseTimeoutRef = useRef<NodeJS.Timeout>();
  const [renderMode, setRenderMode] = useState<'preview' | 'edit'>('preview');
  const [parsedJSXCode, setParsedJSXCode] = useState('');

  // JSON 데이터를 객체로 파싱
  const parsedData = useMemo(() => {
    try {
      return JSON.parse(jsonData);
    } catch {
      return {};
    }
  }, [jsonData]);

  // React 코드에서 JSX 부분만 추출하여 렌더링 가능한 형태로 변환
  const LiveComponent = useMemo(() => {
    if (!reactCode.trim()) return null;

    try {
      // return 문 내의 JSX 추출
      const returnMatch = reactCode.match(/return\s*\(([\s\S]*?)\);/);
      if (!returnMatch) return null;

      let jsxCode = returnMatch[1].trim();

      // data.xxx를 parsedData.xxx로 변환
      jsxCode = jsxCode.replace(/\{data\.(\w+)\}/g, (match, key) => {
        return `{parsedData.${key} || '${key}'}`;
      });

      setParsedJSXCode(jsxCode);

      // Function constructor로 컴포넌트 생성
      const ComponentFunction = new Function(
        'React',
        'parsedData',
        `
        return function DynamicComponent() {
          return (
            ${jsxCode}
          );
        }
        `
      );

      return ComponentFunction(React, parsedData);
    } catch (error) {
      console.error('Component rendering error:', error);
      return null;
    }
  }, [reactCode, parsedData]);

  // React 코드가 변경되면 자동으로 파싱
  useEffect(() => {
    if (reactCode.trim()) {
      // 디바운스: 500ms 후에 파싱
      if (parseTimeoutRef.current) {
        clearTimeout(parseTimeoutRef.current);
      }

      parseTimeoutRef.current = setTimeout(() => {
        parseReactCode(reactCode);
      }, 500);
    }

    return () => {
      if (parseTimeoutRef.current) {
        clearTimeout(parseTimeoutRef.current);
      }
    };
  }, [reactCode]);

  const handleSave = async () => {
    try {
      // TODO: 실제 저장 로직 구현
      toast.success('저장되었습니다.');
    } catch (error) {
      toast.error('저장 중 오류가 발생했습니다.');
    }
  };

  const parseReactCode = (code: string, silent: boolean = true) => {
    try {
      // JSX에서 div 요소들을 추출하는 간단한 파서
      const divRegex = /<div[^>]*>([\s\S]*?)<\/div>/g;
      const matches = [...code.matchAll(divRegex)];

      const parsedComponents: ComponentNode[] = matches.slice(0, 10).map((match, index) => {
        const fullTag = match[0];

        // className 추출
        const classMatch = fullTag.match(/className="([^"]*)"/);
        const className = classMatch ? classMatch[1] : '';

        // style 추출
        const styleMatch = fullTag.match(/style=\{\{([^}]*)\}\}/);
        let styles: any = {};
        if (styleMatch) {
          const styleStr = styleMatch[1];
          const styleProps = styleStr.split(',').map(s => s.trim());
          styleProps.forEach(prop => {
            const [key, value] = prop.split(':').map(s => s.trim());
            if (key && value) {
              const cleanKey = key.replace(/['"]/g, '');
              const cleanValue = value.replace(/['"]/g, '');
              styles[cleanKey] = cleanValue;
            }
          });
        }

        // 텍스트 컨텐츠 추출 (data 바인딩 포함)
        const contentMatch = match[1].trim();
        const dataBindingMatch = contentMatch.match(/\{data\.(\w+)\}/);

        return {
          id: `component-${index}`,
          type: 'div',
          props: {
            className,
            ...styles,
            content: dataBindingMatch ? `{data.${dataBindingMatch[1]}}` : contentMatch
          },
          children: [],
          position: { x: 0, y: index * 100 },
          size: {
            width: parseInt(styles.width) || 200,
            height: parseInt(styles.height) || 100
          }
        };
      });

      // data 바인딩 추출
      const dataBindingRegex = /\{data\.(\w+)\}/g;
      const bindings: DataBinding[] = [];
      let bindingMatch;

      while ((bindingMatch = dataBindingRegex.exec(code)) !== null) {
        const componentIndex = parsedComponents.findIndex(c =>
          c.props.content && c.props.content.includes(bindingMatch[0])
        );

        if (componentIndex !== -1) {
          bindings.push({
            componentId: parsedComponents[componentIndex].id,
            propName: 'content',
            dataPath: `data.${bindingMatch[1]}`
          });
        }
      }

      setComponents(parsedComponents);
      setDataBindings(bindings);

      // 자동 파싱이 아닐 때만 토스트 표시
      if (!silent && parsedComponents.length > 0) {
        toast.success(`${parsedComponents.length}개의 컴포넌트를 불러왔습니다.`);
      }
    } catch (error) {
      console.error('Code parsing error:', error);
      if (!silent) {
        toast.error('코드 파싱 중 오류가 발생했습니다.');
      }
    }
  };

  const handleImportCode = () => {
    if (!reactCode.trim()) {
      toast.error('코드를 입력해주세요.');
      return;
    }
    parseReactCode(reactCode, false); // 수동 불러오기는 토스트 표시
  };

  const handleImportJSON = () => {
    try {
      JSON.parse(jsonData);
      toast.success('JSON 데이터를 불러왔습니다.');
    } catch (error) {
      toast.error('유효하지 않은 JSON 형식입니다.');
    }
  };

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
            뒤로가기
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold">{materialName || '제목 없음'}</span>
            <span className="text-xs text-muted-foreground">
              {id === 'new' ? '새 자료' : `자료 ID: ${id}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="rounded-full">
            <Undo className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="rounded-full">
            <Redo className="w-4 h-4" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setZoom(Math.max(25, zoom - 25))}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm w-12 text-center">{zoom}%</span>
            <Button variant="ghost" size="sm" onClick={() => setZoom(Math.min(200, zoom + 25))}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <Button variant="outline" size="sm" className="rounded-full">
            <Eye className="w-4 h-4 mr-2" />
            미리보기
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            className="rounded-full bg-mango-green hover:bg-mango-green/90 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            저장
          </Button>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 왼쪽 사이드바 - AI 코드 & JSON 데이터 */}
        <div className="w-96 border-r border-border bg-card flex flex-col">
          <Tabs defaultValue="code" className="h-full flex flex-col">
            <div className="px-4 pt-4 pb-2 border-b border-border">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="code" className="text-sm">
                  <Code className="w-4 h-4 mr-2" />
                  AI 코드
                </TabsTrigger>
                <TabsTrigger value="data" className="text-sm">
                  <Database className="w-4 h-4 mr-2" />
                  JSON 데이터
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="code" className="flex-1 flex flex-col m-0 p-4">
              <div className="flex-1 flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold">React 코드</label>
                  <Button size="sm" variant="outline" onClick={handleImportCode} className="h-8">
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    불러오기
                  </Button>
                </div>
                <Textarea
                  value={reactCode}
                  onChange={(e) => setReactCode(e.target.value)}
                  placeholder="AI가 생성한 React 코드를 붙여넣으세요..."
                  className="flex-1 font-mono text-xs resize-none"
                />
                <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg border border-border">
                  <p className="font-semibold mb-2">💡 사용 방법:</p>
                  <ul className="space-y-1.5 ml-1">
                    <li>• AI가 생성한 React 코드를 붙여넣으세요</li>
                    <li>• 불러오기 버튼을 클릭하여 컴포넌트를 시각화합니다</li>
                    <li>• 캔버스에서 드래그&드롭으로 편집할 수 있습니다</li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="data" className="flex-1 flex flex-col m-0 p-4">
              <div className="flex-1 flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold">JSON 데이터</label>
                  <Button size="sm" variant="outline" onClick={handleImportJSON} className="h-8">
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    불러오기
                  </Button>
                </div>
                <Textarea
                  value={jsonData}
                  onChange={(e) => setJsonData(e.target.value)}
                  placeholder='{"key": "value"}'
                  className="flex-1 font-mono text-xs resize-none"
                />
                <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg border border-border">
                  <p className="font-semibold mb-2">💡 사용 방법:</p>
                  <ul className="space-y-1.5 ml-1">
                    <li>• JSON 형식의 데이터를 입력하세요</li>
                    <li>• 데이터 필드를 컴포넌트로 드래그하여 연결합니다</li>
                    <li>• 자동으로 데이터 바인딩이 생성됩니다</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* 중앙 캔버스 */}
        <div className="flex-1 bg-gradient-to-br from-muted/30 to-muted/50 overflow-auto relative">
          <div className="min-h-full flex items-center justify-center p-8">
            <div
              className="bg-white rounded-xl shadow-2xl border border-border transition-all"
              style={{
                width: `${(1200 * zoom) / 100}px`,
                minHeight: `${(800 * zoom) / 100}px`,
                transformOrigin: 'center'
              }}
            >
              {/* 캔버스 영역 */}
              <div className="w-full min-h-full">
                {!LiveComponent ? (
                  <div className="h-[700px] flex flex-col items-center justify-center text-muted-foreground p-8">
                    <div className="text-center space-y-4">
                      <Layers className="w-20 h-20 mx-auto opacity-10" />
                      <div>
                        <p className="text-xl font-semibold mb-2">캔버스가 비어있습니다</p>
                        <p className="text-sm text-muted-foreground">
                          왼쪽에서 AI 코드를 붙여넣어 시작하세요
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    {/* 모드 전환 버튼 */}
                    <div className="absolute top-4 right-4 z-10 flex gap-2">
                      <Button
                        size="sm"
                        variant={renderMode === 'preview' ? 'default' : 'outline'}
                        onClick={() => setRenderMode('preview')}
                        className="rounded-full"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        미리보기
                      </Button>
                      <Button
                        size="sm"
                        variant={renderMode === 'edit' ? 'default' : 'outline'}
                        onClick={() => setRenderMode('edit')}
                        className="rounded-full"
                      >
                        <Settings className="w-3 h-3 mr-1" />
                        편집모드
                      </Button>
                    </div>

                    {renderMode === 'preview' ? (
                      /* 실제 컴포넌트 렌더링 */
                      <div className="w-full overflow-auto">
                        <LiveComponent />
                      </div>
                    ) : (
                      /* 편집 모드 - 컴포넌트 목록 */
                      <div className="p-8 space-y-3">
                        {components.map((component) => {
                          const bgColor = component.props.className?.match(/bg-\[([^\]]+)\]/)?.[1] || '#f5f5f5';
                          const hasContent = component.props.content && component.props.content.trim();

                          return (
                            <Card
                              key={component.id}
                              className={`cursor-pointer transition-all hover:shadow-md relative ${
                                selectedComponent === component.id
                                  ? 'ring-2 ring-mango-green shadow-lg'
                                  : 'hover:ring-1 hover:ring-mango-green/50'
                              }`}
                              onClick={() => setSelectedComponent(component.id)}
                              style={{
                                minHeight: '80px'
                              }}
                            >
                              <div className="p-4 flex items-start gap-3">
                                {/* 컬러 미리보기 */}
                                <div
                                  className="w-12 h-12 rounded border border-border flex-shrink-0"
                                  style={{ backgroundColor: bgColor }}
                                />

                                {/* 컴포넌트 정보 */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                                      {component.type}
                                    </span>
                                    {component.props.width && component.props.height && (
                                      <span className="text-xs text-muted-foreground">
                                        {component.props.width} × {component.props.height}
                                      </span>
                                    )}
                                  </div>

                                  {hasContent && (
                                    <div className="text-sm text-foreground mt-2 line-clamp-2">
                                      {component.props.content}
                                    </div>
                                  )}

                                  {/* 스타일 정보 */}
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {component.props.className && (
                                      <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">
                                        {component.props.className.split(' ').slice(0, 2).join(' ')}
                                      </span>
                                    )}
                                    {component.props.left && (
                                      <span className="text-xs px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded">
                                        left: {component.props.left}
                                      </span>
                                    )}
                                    {component.props.top && (
                                      <span className="text-xs px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded">
                                        top: {component.props.top}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* 선택 표시 */}
                                {selectedComponent === component.id && (
                                  <div className="absolute top-2 right-2 w-2 h-2 bg-mango-green rounded-full" />
                                )}
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 캔버스 하단 툴바 */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-card/95 backdrop-blur-sm border border-border rounded-full px-5 py-2.5 shadow-xl flex items-center gap-3">
            <Button variant="ghost" size="sm" className="rounded-full h-8">
              <Play className="w-4 h-4 mr-1.5" />
              실행
            </Button>
            <Separator orientation="vertical" className="h-5" />
            <span className="text-xs font-medium text-muted-foreground">
              {components.length}개 컴포넌트
            </span>
          </div>
        </div>

        {/* 오른쪽 사이드바 - 속성 패널 */}
        <div className="w-96 border-l border-border bg-card flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Settings className="w-5 h-5" />
              속성 패널
            </h3>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              {!selectedComponent ? (
                <div className="text-center text-muted-foreground py-16">
                  <Settings className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-sm font-medium">컴포넌트를 선택하세요</p>
                  <p className="text-xs mt-1">캔버스에서 컴포넌트를 클릭하면 속성을 편집할 수 있습니다</p>
                </div>
              ) : (
                <>
                  {/* 기본 정보 */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold">기본 정보</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                          자료 이름
                        </label>
                        <Input
                          value={materialName}
                          onChange={(e) => setMaterialName(e.target.value)}
                          placeholder="자료 이름을 입력하세요"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                          설명
                        </label>
                        <Textarea
                          value={materialDescription}
                          onChange={(e) => setMaterialDescription(e.target.value)}
                          placeholder="자료 설명을 입력하세요"
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* 컴포넌트 속성 */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold">컴포넌트 속성</h4>
                    <div className="space-y-3">
                      {(() => {
                        const component = components.find(c => c.id === selectedComponent);
                        if (!component) return null;

                        return (
                          <>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground block mb-1.5">타입</label>
                              <Input disabled value={component.type} />
                            </div>

                            {component.props.content && (
                              <div>
                                <label className="text-xs font-medium text-muted-foreground block mb-1.5">내용</label>
                                <Textarea
                                  value={component.props.content}
                                  readOnly
                                  rows={2}
                                  className="font-mono text-xs"
                                />
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-medium text-muted-foreground block mb-1.5">너비</label>
                                <Input
                                  value={component.props.width || 'auto'}
                                  readOnly
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-muted-foreground block mb-1.5">높이</label>
                                <Input
                                  value={component.props.height || 'auto'}
                                  readOnly
                                />
                              </div>
                            </div>

                            {(component.props.left || component.props.top) && (
                              <div className="grid grid-cols-2 gap-3">
                                {component.props.left && (
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">Left</label>
                                    <Input value={component.props.left} readOnly />
                                  </div>
                                )}
                                {component.props.top && (
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">Top</label>
                                    <Input value={component.props.top} readOnly />
                                  </div>
                                )}
                              </div>
                            )}

                            {component.props.className && (
                              <div>
                                <label className="text-xs font-medium text-muted-foreground block mb-1.5">클래스</label>
                                <Textarea
                                  value={component.props.className}
                                  readOnly
                                  rows={2}
                                  className="font-mono text-xs"
                                />
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <Separator />

                  {/* 데이터 바인딩 */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold">데이터 바인딩</h4>
                    <div className="space-y-2">
                      {dataBindings
                        .filter((binding) => binding.componentId === selectedComponent)
                        .map((binding, index) => (
                          <div
                            key={index}
                            className="p-3 bg-muted/50 rounded-lg border border-border"
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-semibold">{binding.propName}</span>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive">
                                ×
                              </Button>
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {binding.dataPath}
                            </div>
                          </div>
                        ))}
                      {dataBindings.filter((b) => b.componentId === selectedComponent)
                        .length === 0 && (
                        <div className="text-center text-muted-foreground py-8 border-2 border-dashed rounded-lg">
                          <Database className="w-10 h-10 mx-auto mb-2 opacity-20" />
                          <p className="text-xs font-medium">연결된 데이터가 없습니다</p>
                          <p className="text-xs mt-1">JSON 데이터를 드래그하여 연결하세요</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
