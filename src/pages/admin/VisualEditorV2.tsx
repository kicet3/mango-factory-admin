import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Rnd } from 'react-rnd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Save,
  Code,
  Database,
  Layers,
  Settings,
  Upload,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface EditableElement {
  id: string;
  type: 'div' | 'text';
  content: string;
  style: {
    position: string;
    left: string;
    top: string;
    width: string;
    height: string;
    backgroundColor?: string;
    color?: string;
    fontSize?: string;
    fontWeight?: string;
    textAlign?: string;
    border?: string;
  };
  className: string;
  dataBinding?: string;
}

export default function VisualEditorV2() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [elements, setElements] = useState<EditableElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reactCode, setReactCode] = useState('');
  const [jsonData, setJsonData] = useState('{}');
  const [zoom, setZoom] = useState(100);
  const [canvasSize] = useState({ width: 1280, height: 720 });
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [conversionData, setConversionData] = useState<any>(null);
  const [renderMode, setRenderMode] = useState<'preview' | 'edit'>('edit');

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

  // JWT 토큰을 포함한 헤더 생성
  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    return headers;
  };

  // Conversion 데이터 로드
  useEffect(() => {
    const loadConversionData = async () => {
      if (!id || id === 'new') {
        // 새 자료 생성 모드 - 세션 스토리지에서 데이터 로드
        const newMaterialData = sessionStorage.getItem('newMaterialData');
        if (newMaterialData) {
          const data = JSON.parse(newMaterialData);
          console.log('📁 세션 스토리지 데이터:', data);

          if (data.components && data.components.length > 0) {
            setReactCode(data.components[0]);
            setTotalPages(data.components.length);
            setCurrentPage(0);
          }
          if (data.slidesData && data.slidesData.length > 0) {
            setJsonData(JSON.stringify(data.slidesData[0], null, 2));
          }
        } else {
          setLoading(false);
        }
        return;
      }

      // 기존 자료 수정 모드 - API에서 데이터 로드
      try {
        setLoading(true);
        const headers = await getAuthHeaders();

        const response = await fetch(`${API_BASE_URL}/conversions/${id}`, {
          method: 'GET',
          headers,
          mode: 'cors',
        });

        if (!response.ok) {
          throw new Error(`서버 오류: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ API 응답 데이터:', data);

        setConversionData(data);
        setTotalPages(data.total_slides || data.slides?.length || 1);

        // 첫 번째 슬라이드의 layout_component와 매칭되는 컴포넌트 로드
        if (data.slides && data.slides.length > 0 && data.components && data.components.length > 0) {
          const firstSlide = data.slides[0];
          const layoutComponent = firstSlide.layout_component;

          // layout_component와 component_name이 일치하는 컴포넌트 찾기
          const matchedComponent = data.components.find((comp: any) => comp.component_name === layoutComponent);

          if (matchedComponent) {
            const fullCode = matchedComponent.imports && matchedComponent.imports.length > 0
              ? `${matchedComponent.imports.join('\n')}\n\n${matchedComponent.code}`
              : matchedComponent.code;

            console.log(`📦 슬라이드 1: layout_component="${layoutComponent}" → 컴포넌트="${matchedComponent.component_name}"`);
            console.log('📝 매칭된 React 코드 길이:', fullCode.length);

            setReactCode(fullCode);
          } else {
            console.error(`❌ layout_component="${layoutComponent}"와 일치하는 컴포넌트를 찾을 수 없습니다`);
          }

          // 첫 번째 슬라이드 데이터 로드
          console.log('🎬 첫 번째 슬라이드 데이터:', firstSlide.data);
          setJsonData(JSON.stringify(firstSlide.data, null, 2));
        } else {
          console.error('❌ slides 또는 components 데이터가 없습니다');
        }

        toast.success('자료를 불러왔습니다.');
      } catch (error: any) {
        console.error('Error loading conversion:', error);
        toast.error(error.message || '자료를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadConversionData();
  }, [id]);

  // React 코드 파싱하여 편집 가능한 요소로 변환
  const parseReactCodeToElements = (code: string) => {
    try {
      const parsedElements: EditableElement[] = [];

      // JSON 데이터 파싱
      let currentData: any = {};
      try {
        currentData = JSON.parse(jsonData);
        console.log('📊 JSON 데이터:', currentData);
      } catch (e) {
        console.warn('JSON 데이터 파싱 실패:', e);
      }

      // conversion data에서 layout_styles 가져오기
      const layoutStyles = conversionData?.components?.[0]?.layout_styles;
      console.log('🎨 layout_styles:', layoutStyles);
      console.log('📦 conversionData:', conversionData);

      if (layoutStyles) {
        // layout_styles가 있으면 이를 기반으로 요소 생성
        console.log('✅ layout_styles 기반으로 요소 생성');
        Object.keys(layoutStyles).forEach((key, index) => {
          const style = layoutStyles[key];
          const content = currentData[key] || style.placeholder || '';

          console.log(`  ${key}: "${content}" (from data: ${currentData[key] ? 'YES' : 'NO'})`);

          parsedElements.push({
            id: `element-${index}`,
            type: 'text',
            content: content,
            style: {
              position: 'absolute',
              left: `${style.x}px`,
              top: `${style.y}px`,
              width: `${style.width}px`,
              height: `${style.height}px`,
              backgroundColor: style.backgroundColor || 'transparent',
              color: style.color || '#000000',
              fontSize: style.fontSize ? `${style.fontSize}px` : '16px',
              fontWeight: style.fontWeight || 'normal',
              textAlign: (style.textAlign || 'left') as 'left' | 'center' | 'right',
              border: style.borderWidth ? `${style.borderWidth}px solid ${style.borderColor || '#000000'}` : 'none',
            },
            className: '',
            dataBinding: key,
          });
        });
      } else {
        console.log('⚠️ layout_styles 없음, 코드 파싱 시도');
        // layout_styles가 없으면 기존 코드 파싱 로직 사용
        const divRegex = /<div[^>]*>([\s\S]*?)<\/div>/g;
        let match;
        let elementId = 0;

        while ((match = divRegex.exec(code)) !== null) {
          const fullTag = match[0];

          // className 추출
          const classMatch = fullTag.match(/className="([^"]*)"/);
          const className = classMatch ? classMatch[1] : '';

          // style 추출
          const styleMatch = fullTag.match(/style=\{\{([^}]*)\}\}/);
          const styleObj: any = {
            position: 'absolute',
            left: '0px',
            top: '0px',
            width: '100px',
            height: '100px'
          };

          if (styleMatch) {
            const styleStr = styleMatch[1];
            const styleProps = styleStr.split(',');

            styleProps.forEach(prop => {
              const [key, value] = prop.split(':').map(s => s.trim());
              if (key && value) {
                const cleanKey = key.replace(/['"]/g, '');
                const cleanValue = value.replace(/['"]/g, '');

                // camelCase로 변환
                const camelKey = cleanKey.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                styleObj[camelKey] = cleanValue;
              }
            });
          }

          // 배경색 추출
          const bgMatch = className.match(/bg-\[([^\]]+)\]/);
          if (bgMatch) {
            styleObj.backgroundColor = bgMatch[1];
          }

          // 텍스트 컨텐츠 및 데이터 바인딩
          const innerContent = match[1].trim();
          const dataBindingMatch = innerContent.match(/\{data\.(\w+)\}/);

          let actualContent = innerContent;
          let dataBinding = undefined;

          if (dataBindingMatch) {
            dataBinding = dataBindingMatch[1];
            // JSON 데이터에서 실제 값 가져오기
            actualContent = currentData[dataBinding] || dataBinding;
          }

          const element: EditableElement = {
            id: `element-${elementId++}`,
            type: innerContent && !dataBindingMatch ? 'div' : 'text',
            content: actualContent,
            style: styleObj,
            className,
            dataBinding: dataBinding
          };

          parsedElements.push(element);
        }
      }

      setElements(parsedElements);
      if (parsedElements.length > 0) {
        toast.success(`${parsedElements.length}개 요소를 불러왔습니다`);
      }
    } catch (error) {
      console.error('Parsing error:', error);
      toast.error('코드 파싱 중 오류가 발생했습니다');
    }
  };

  // React 코드 또는 JSON 데이터 변경 시 자동 파싱
  useEffect(() => {
    if (reactCode.trim() && jsonData.trim()) {
      const timer = setTimeout(() => {
        parseReactCodeToElements(reactCode);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [reactCode, jsonData, conversionData]);

  // JSON 데이터 파싱
  const parsedData = React.useMemo(() => {
    try {
      return JSON.parse(jsonData);
    } catch {
      return {};
    }
  }, [jsonData]);

  // 선택된 요소
  const selectedElement = elements.find(el => el.id === selectedId);

  // 요소 위치 업데이트
  const updateElementPosition = (id: string, x: number, y: number) => {
    setElements(prev =>
      prev.map(el =>
        el.id === id
          ? { ...el, style: { ...el.style, left: `${x}px`, top: `${y}px` } }
          : el
      )
    );
  };

  // 요소 크기 업데이트
  const updateElementSize = (id: string, width: number, height: number) => {
    setElements(prev =>
      prev.map(el =>
        el.id === id
          ? { ...el, style: { ...el.style, width: `${width}px`, height: `${height}px` } }
          : el
      )
    );
  };

  // 요소 속성 업데이트
  const updateElementProperty = (property: string, value: string) => {
    if (!selectedId) return;

    setElements(prev =>
      prev.map(el => {
        if (el.id === selectedId) {
          if (property === 'content') {
            return { ...el, content: value };
          } else if (property.startsWith('style.')) {
            const styleProp = property.replace('style.', '');
            return { ...el, style: { ...el.style, [styleProp]: value } };
          }
        }
        return el;
      })
    );
  };

  // 페이지 변경
  const handlePageChange = (pageIndex: number) => {
    if (pageIndex < 0 || pageIndex >= totalPages) return;

    setCurrentPage(pageIndex);

    // 새 자료 생성 모드
    if (id === 'new') {
      const newMaterialData = sessionStorage.getItem('newMaterialData');
      if (newMaterialData) {
        const data = JSON.parse(newMaterialData);
        if (data.components && data.components[pageIndex]) {
          setReactCode(data.components[pageIndex]);
        }
        if (data.slidesData && data.slidesData[pageIndex]) {
          setJsonData(JSON.stringify(data.slidesData[pageIndex], null, 2));
        }
      }
      return;
    }

    // 기존 자료 수정 모드
    if (conversionData) {
      // 해당 슬라이드의 layout_component와 매칭되는 컴포넌트 찾기
      if (conversionData.slides && conversionData.slides[pageIndex] && conversionData.components) {
        const slide = conversionData.slides[pageIndex];
        const layoutComponent = slide.layout_component;

        const matchedComponent = conversionData.components.find((comp: any) => comp.component_name === layoutComponent);

        if (matchedComponent) {
          const fullCode = matchedComponent.imports && matchedComponent.imports.length > 0
            ? `${matchedComponent.imports.join('\n')}\n\n${matchedComponent.code}`
            : matchedComponent.code;

          console.log(`📦 슬라이드 ${pageIndex + 1}: layout_component="${layoutComponent}" → 컴포넌트="${matchedComponent.component_name}"`);
          setReactCode(fullCode);
        } else {
          console.error(`❌ layout_component="${layoutComponent}"와 일치하는 컴포넌트를 찾을 수 없습니다`);
        }
      }

      // 슬라이드 데이터만 변경
      if (conversionData.slides && conversionData.slides[pageIndex]) {
        const slide = conversionData.slides[pageIndex];
        setJsonData(JSON.stringify(slide.data, null, 2));
      }
    }
  };

  // 편집된 내용을 React 코드로 변환
  const generateReactCode = () => {
    let generatedCode = `import React from 'react';\n\n`;
    generatedCode += `function GeneratedComponent({ data }) {\n`;
    generatedCode += `  return (\n`;
    generatedCode += `    <div \n`;
    generatedCode += `      className="relative bg-white" \n`;
    generatedCode += `      style={{ width: '${canvasSize.width}px', height: '${canvasSize.height}px' }}\n`;
    generatedCode += `    >\n`;

    elements.forEach((element) => {
      generatedCode += `      <div \n`;
      generatedCode += `        className="${element.className}" \n`;
      generatedCode += `        style={{ \n`;

      Object.entries(element.style).forEach(([key, value]) => {
        generatedCode += `          ${key}: '${value}',\n`;
      });

      generatedCode += `        }}\n`;
      generatedCode += `      >\n`;

      if (element.dataBinding) {
        generatedCode += `        {data.${element.dataBinding}}\n`;
      } else if (element.content) {
        generatedCode += `        ${element.content}\n`;
      }

      generatedCode += `      </div>\n`;
    });

    generatedCode += `    </div>\n`;
    generatedCode += `  );\n`;
    generatedCode += `}\n\n`;
    generatedCode += `export default GeneratedComponent;\n`;

    return generatedCode;
  };

  const handleExportCode = () => {
    const code = generateReactCode();
    navigator.clipboard.writeText(code);
    toast.success('코드가 클립보드에 복사되었습니다');
  };


  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mango-green mx-auto"></div>
          <p className="text-muted-foreground">자료를 불러오는 중...</p>
        </div>
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
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            뒤로가기
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <span className="text-sm font-semibold">
            비주얼 에디터 V2
            {conversionData && ` - ${conversionData.original_filename}`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {totalPages > 1 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 0}
              >
                이전
              </Button>
              <span className="text-sm px-2">
                {currentPage + 1} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages - 1}
              >
                다음
              </Button>
              <Separator orientation="vertical" className="h-6" />
            </>
          )}
          <Button variant="ghost" size="sm">
            <Undo className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Redo className="w-4 h-4" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button variant="ghost" size="sm" onClick={() => setZoom(Math.max(25, zoom - 25))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm w-12 text-center">{zoom}%</span>
          <Button variant="ghost" size="sm" onClick={() => setZoom(Math.min(200, zoom + 25))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button variant="outline" size="sm" onClick={handleExportCode}>
            <Download className="w-4 h-4 mr-2" />
            코드 내보내기
          </Button>
          <Button size="sm" className="bg-mango-green hover:bg-mango-green/90 text-white">
            <Save className="w-4 h-4 mr-2" />
            저장
          </Button>
        </div>
      </div>

      {/* 메인 영역 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 왼쪽 - 코드 & 데이터 */}
        <div className="w-96 border-r border-border bg-card flex flex-col">
          <Tabs defaultValue="code" className="h-full flex flex-col">
            <div className="px-4 pt-4 pb-2 border-b border-border">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="code">
                  <Code className="w-4 h-4 mr-2" />
                  React 코드
                </TabsTrigger>
                <TabsTrigger value="data">
                  <Database className="w-4 h-4 mr-2" />
                  JSON 데이터
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="code" className="flex-1 flex flex-col m-0 p-4">
              <div className="flex-1 flex flex-col space-y-3">
                <Label>AI 생성 코드를 붙여넣으세요</Label>
                <Textarea
                  value={reactCode}
                  onChange={(e) => setReactCode(e.target.value)}
                  placeholder="React 코드를 붙여넣으면 자동으로 시각화됩니다..."
                  className="flex-1 font-mono text-xs resize-none"
                />
              </div>
            </TabsContent>

            <TabsContent value="data" className="flex-1 flex flex-col m-0 p-4">
              <div className="flex-1 flex flex-col space-y-3">
                <Label>JSON 데이터</Label>
                <Textarea
                  value={jsonData}
                  onChange={(e) => setJsonData(e.target.value)}
                  className="flex-1 font-mono text-xs resize-none"
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* 중앙 - 캔버스 */}
        <div className="flex-1 bg-gradient-to-br from-muted/30 to-muted/50 overflow-auto p-8">
          <div className="flex items-center justify-center min-h-full">
            <div
              className="bg-white rounded-lg shadow-2xl border border-border relative"
              style={{
                width: canvasSize.width,
                height: canvasSize.height,
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'center'
              }}
            >
              {elements.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                  <Layers className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-lg font-semibold">왼쪽에 React 코드를 붙여넣으세요</p>
                  <p className="text-sm">자동으로 편집 가능한 요소로 변환됩니다</p>
                </div>
              ) : (
                elements.map((element) => (
                  <Rnd
                    key={element.id}
                    position={{
                      x: parseFloat(element.style.left) || 0,
                      y: parseFloat(element.style.top) || 0
                    }}
                    size={{
                      width: parseFloat(element.style.width) || 100,
                      height: parseFloat(element.style.height) || 100
                    }}
                    onDragStop={(e, d) => {
                      updateElementPosition(element.id, d.x, d.y);
                    }}
                    onResizeStop={(e, direction, ref, delta, position) => {
                      updateElementSize(
                        element.id,
                        parseInt(ref.style.width),
                        parseInt(ref.style.height)
                      );
                      updateElementPosition(element.id, position.x, position.y);
                    }}
                    bounds="parent"
                    className={`${
                      selectedId === element.id
                        ? 'ring-2 ring-mango-green'
                        : 'hover:ring-1 hover:ring-mango-green/50'
                    }`}
                    onClick={() => setSelectedId(element.id)}
                  >
                    <div
                      className={element.className}
                      style={{
                        ...element.style,
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        cursor: 'move'
                      }}
                    >
                      {element.dataBinding
                        ? parsedData[element.dataBinding] || element.dataBinding
                        : element.content}
                    </div>
                  </Rnd>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 오른쪽 - 속성 패널 */}
        <div className="w-96 border-l border-border bg-card flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Settings className="w-5 h-5" />
              속성 편집
            </h3>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              {!selectedElement ? (
                <div className="text-center text-muted-foreground py-16">
                  <Settings className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-sm font-medium">요소를 선택하세요</p>
                  <p className="text-xs mt-1">캔버스에서 요소를 클릭하면 편집할 수 있습니다</p>
                </div>
              ) : (
                <>
                  {/* 내용 편집 */}
                  <div className="space-y-3">
                    <Label>내용</Label>
                    {selectedElement.dataBinding ? (
                      <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                        데이터 바인딩: {selectedElement.dataBinding}
                        <br />
                        현재 값: {parsedData[selectedElement.dataBinding] || '없음'}
                      </div>
                    ) : (
                      <Textarea
                        value={selectedElement.content}
                        onChange={(e) => updateElementProperty('content', e.target.value)}
                        rows={3}
                      />
                    )}
                  </div>

                  <Separator />

                  {/* 위치 */}
                  <div className="space-y-3">
                    <Label>위치</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Left (X)</Label>
                        <Input
                          type="number"
                          value={parseFloat(selectedElement.style.left) || 0}
                          onChange={(e) =>
                            updateElementProperty('style.left', `${e.target.value}px`)
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Top (Y)</Label>
                        <Input
                          type="number"
                          value={parseFloat(selectedElement.style.top) || 0}
                          onChange={(e) =>
                            updateElementProperty('style.top', `${e.target.value}px`)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* 크기 */}
                  <div className="space-y-3">
                    <Label>크기</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Width</Label>
                        <Input
                          type="number"
                          value={parseFloat(selectedElement.style.width) || 0}
                          onChange={(e) =>
                            updateElementProperty('style.width', `${e.target.value}px`)
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Height</Label>
                        <Input
                          type="number"
                          value={parseFloat(selectedElement.style.height) || 0}
                          onChange={(e) =>
                            updateElementProperty('style.height', `${e.target.value}px`)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* 스타일 */}
                  <div className="space-y-3">
                    <Label>스타일</Label>
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs">배경색</Label>
                        <Input
                          type="color"
                          value={selectedElement.style.backgroundColor || '#ffffff'}
                          onChange={(e) =>
                            updateElementProperty('style.backgroundColor', e.target.value)
                          }
                        />
                      </div>
                      {selectedElement.type === 'text' && (
                        <>
                          <div>
                            <Label className="text-xs">글자색</Label>
                            <Input
                              type="color"
                              value={selectedElement.style.color || '#000000'}
                              onChange={(e) =>
                                updateElementProperty('style.color', e.target.value)
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-xs">글자 크기</Label>
                            <Input
                              value={selectedElement.style.fontSize || '16px'}
                              onChange={(e) =>
                                updateElementProperty('style.fontSize', e.target.value)
                              }
                            />
                          </div>
                        </>
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
