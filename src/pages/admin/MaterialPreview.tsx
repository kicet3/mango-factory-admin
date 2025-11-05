import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Download, Share2, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function MaterialPreview() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [conversionData, setConversionData] = useState<any>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);

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
      if (!id) {
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
          throw new Error(`서버 오류: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ API 응답 데이터:', data);

        setConversionData(data);
      } catch (error: any) {
        console.error('❌ 변환 데이터 로드 실패:', error);
        toast.error('데이터를 불러오는데 실패했습니다');
      } finally {
        setLoading(false);
      }
    };

    loadConversionData();
  }, [id]);

  // 현재 슬라이드의 컴포넌트와 데이터 가져오기
  const getCurrentSlideData = () => {
    console.log('🔍 getCurrentSlideData 호출');

    if (!conversionData) {
      console.log('❌ conversionData가 없습니다');
      return null;
    }

    if (!conversionData.slides) {
      console.log('❌ conversionData.slides가 없습니다');
      return null;
    }

    if (!conversionData.components) {
      console.log('❌ conversionData.components가 없습니다');
      return null;
    }

    console.log('📋 총 슬라이드 수:', conversionData.slides.length);
    console.log('📋 총 컴포넌트 수:', conversionData.components.length);
    console.log('📍 현재 슬라이드 인덱스:', currentSlideIndex);

    const currentSlide = conversionData.slides[currentSlideIndex];
    if (!currentSlide) {
      console.log('❌ 현재 슬라이드를 찾을 수 없습니다');
      return null;
    }

    console.log('📄 현재 슬라이드:', currentSlide);

    const layoutComponent = currentSlide.layout_component;
    console.log('🎨 layout_component:', layoutComponent);

    console.log('🔍 사용 가능한 컴포넌트 이름들:', conversionData.components.map((c: any) => c.component_name));

    const matchedComponent = conversionData.components.find(
      (comp: any) => comp.component_name === layoutComponent
    );

    if (!matchedComponent) {
      console.error(`❌ layout_component="${layoutComponent}"와 일치하는 컴포넌트를 찾을 수 없습니다`);
      return null;
    }

    console.log('✅ 매칭된 컴포넌트:', matchedComponent.component_name);
    console.log('📝 컴포넌트 코드 길이:', matchedComponent.code?.length);
    console.log('📦 imports 수:', matchedComponent.imports?.length || 0);

    let fullCode = matchedComponent.imports && matchedComponent.imports.length > 0
      ? `${matchedComponent.imports.join('\n')}\n\n${matchedComponent.code}`
      : matchedComponent.code;

    // import 문 제거 (Babel standalone에서는 사용 불가)
    fullCode = fullCode.replace(/import\s+.*?from\s+['"].*?['"];?\s*/g, '');

    // export default 제거
    fullCode = fullCode.replace(/export\s+default\s+/g, '');

    // 컴포넌트 이름 추출 (변경하지 않고 그대로 사용)
    const componentNameMatch = fullCode.match(/function\s+(\w+)/);
    const componentName = componentNameMatch ? componentNameMatch[1] : 'Component';

    console.log('📝 최종 React 코드:');
    console.log('─────────────────────────────────────');
    console.log(fullCode);
    console.log('─────────────────────────────────────');
    console.log('🎨 컴포넌트 이름:', componentName);

    console.log('📊 슬라이드 데이터:');
    console.log(JSON.stringify(currentSlide.data, null, 2));

    return {
      reactCode: fullCode,
      componentName: componentName,
      jsonData: currentSlide.data
    };
  };

  const slideData = getCurrentSlideData();
  const totalSlides = conversionData?.slides?.length || 0;

  // 디버깅 로그
  useEffect(() => {
    if (slideData) {
      console.log('📊 현재 슬라이드 데이터:', {
        slideIndex: currentSlideIndex,
        reactCodeLength: slideData.reactCode.length,
        jsonData: slideData.jsonData,
        reactCodePreview: slideData.reactCode.substring(0, 200)
      });
    }
  }, [slideData, currentSlideIndex]);

  const handlePrevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const handleNextSlide = () => {
    if (currentSlideIndex < totalSlides - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
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
            목록으로
          </Button>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">
              {conversionData?.original_filename || '자료 미리보기'}
            </span>
            <span className="text-xs text-muted-foreground">
              {totalSlides > 0 && `${currentSlideIndex + 1} / ${totalSlides} 슬라이드`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 슬라이드 네비게이션 */}
          {totalSlides > 1 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevSlide}
                disabled={currentSlideIndex === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextSlide}
                disabled={currentSlideIndex >= totalSlides - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/admin/materials-v2/editor/${id}`)}
            className="rounded-full"
          >
            <Edit className="w-4 h-4 mr-2" />
            수정하기
          </Button>
          <Button variant="outline" size="sm" className="rounded-full">
            <Share2 className="w-4 h-4 mr-2" />
            공유
          </Button>
          <Button variant="outline" size="sm" className="rounded-full">
            <Download className="w-4 h-4 mr-2" />
            내보내기
          </Button>
        </div>
      </div>

      {/* 미리보기 영역 */}
      <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-8">
        {loading ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mango-green mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">데이터 로딩 중...</p>
          </div>
        ) : !slideData ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <p className="text-lg text-muted-foreground mb-2">데이터를 불러올 수 없습니다</p>
            <p className="text-sm text-muted-foreground">
              변환 데이터가 없거나 형식이 올바르지 않습니다.
            </p>
          </div>
        ) : (
          <div className="bg-white shadow-2xl" style={{ width: '1280px', height: '720px' }}>
            <iframe
              key={`slide-${currentSlideIndex}`}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              title="Preview"
              srcDoc={(() => {
                const html = `
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <script src="https://cdn.tailwindcss.com"></script>
                    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
                    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
                    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
                    <style>
                      * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                      }
                      body {
                        width: 1280px;
                        height: 720px;
                        overflow: hidden;
                      }
                      #root {
                        width: 100%;
                        height: 100%;
                      }
                    </style>
                  </head>
                  <body>
                    <div id="root"></div>
                    <script type="text/babel">
                      try {
                        console.log('🚀 React 컴포넌트 렌더링 시작');
                        const { useState, useEffect } = React;

                        ${slideData.reactCode}

                        const jsonData = ${JSON.stringify(slideData.jsonData)};
                        console.log('📊 JSON 데이터:', jsonData);
                        console.log('🎨 컴포넌트 이름:', '${slideData.componentName}');

                        // 컴포넌트가 정의되어 있다면 렌더링
                        const ComponentToRender = ${slideData.componentName};
                        if (typeof ComponentToRender !== 'undefined') {
                          console.log('✅ ${slideData.componentName} 컴포넌트 발견, 렌더링 시작');
                          const root = ReactDOM.createRoot(document.getElementById('root'));
                          root.render(<ComponentToRender data={jsonData} />);
                        } else {
                          console.error('❌ ${slideData.componentName} 컴포넌트를 찾을 수 없습니다');
                          document.getElementById('root').innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; font-size: 24px; color: #666;">컴포넌트를 불러올 수 없습니다.</div>';
                        }
                      } catch (error) {
                        console.error('❌ 렌더링 오류:', error);
                        document.getElementById('root').innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; flex-direction: column; font-size: 18px; color: #e53e3e; padding: 20px;"><div style="font-weight: bold; margin-bottom: 10px;">렌더링 오류</div><div style="font-size: 14px; color: #666;">' + error.message + '</div></div>';
                      }
                    </script>
                  </body>
                </html>
              `;
                console.log('🌐 iframe에 전달되는 HTML:');
                console.log('═════════════════════════════════════');
                console.log(html);
                console.log('═════════════════════════════════════');
                return html;
              })()}
            />
          </div>
        )}
      </div>
    </div>
  );
}
