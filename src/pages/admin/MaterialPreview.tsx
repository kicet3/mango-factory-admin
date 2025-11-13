import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Download, Share2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function MaterialPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);

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

  // iframe에 현재 슬라이드 렌더링
  useEffect(() => {
    if (!conversionData || !conversionData.slides[currentSlideIndex] || !iframeRef.current) return;

    const currentSlide = conversionData.slides[currentSlideIndex];
    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) return;

    // 디버깅: 현재 슬라이드와 컴포넌트 정보 출력
    console.log('=== Slide Rendering Debug ===');
    console.log('Current Slide:', currentSlide);
    console.log('Layout Component Name:', currentSlide.layout_component);
    console.log('Available Components:', conversionData.components?.map((c: any) => ({
      id: c.id,
      name: c.component_name,
      hasCode: !!c.code,
      codeLength: c.code?.length || 0
    })));

    const layoutComponentName = currentSlide.layout_component;

    if (!layoutComponentName) {
      // layout_component가 없으면 슬라이드 콘텐츠만 표시
      const simpleHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: system-ui, -apple-system, sans-serif;
                overflow: auto;
                background: white;
                padding: 40px;
              }
              h1 { font-size: 2.5rem; font-weight: bold; margin-bottom: 1rem; }
              p { font-size: 1.125rem; line-height: 1.75; white-space: pre-wrap; }
            </style>
          </head>
          <body>
            ${currentSlide.slide_title ? `<h1>${currentSlide.slide_title}</h1>` : ''}
            ${currentSlide.slide_content ? `<p>${currentSlide.slide_content}</p>` : ''}
            ${!currentSlide.slide_title && !currentSlide.slide_content ? '<p>슬라이드 콘텐츠가 없습니다</p>' : ''}
          </body>
        </html>
      `;
      iframeDoc.open();
      iframeDoc.write(simpleHtml);
      iframeDoc.close();
      return;
    }

    // layout_component와 매칭되는 컴포넌트 찾기
    let component = conversionData.components?.find((c: any) =>
      c.component_name === layoutComponentName
    );

    // 매칭 실패 시 대소문자 무시하고 재시도
    if (!component) {
      console.warn(`Exact match failed for: ${layoutComponentName}, trying case-insensitive match`);
      component = conversionData.components?.find((c: any) =>
        c.component_name?.toLowerCase() === layoutComponentName.toLowerCase()
      );
    }

    // 여전히 실패 시 부분 매칭 시도
    if (!component) {
      console.warn(`Case-insensitive match failed, trying partial match`);
      component = conversionData.components?.find((c: any) =>
        c.component_name?.includes(layoutComponentName) ||
        layoutComponentName.includes(c.component_name || '')
      );
    }

    // 여전히 실패 시 슬라이드 번호로 매칭 시도
    if (!component && conversionData.components?.length > 0) {
      console.warn(`Partial match failed, using slide index: ${currentSlideIndex}`);
      component = conversionData.components[currentSlideIndex] || conversionData.components[0];
    }

    const componentCode = component?.code;

    if (!component || !componentCode) {
      console.error(`Component not found or has no code: ${layoutComponentName}`);
      console.error('Available components:', conversionData.components?.map((c: any) => c.component_name));

      const errorHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://cdn.tailwindcss.com"></script>
          </head>
          <body class="flex items-center justify-center min-h-screen bg-red-50">
            <div class="text-center p-8 max-w-2xl">
              <h1 class="text-2xl font-bold text-red-600 mb-4">컴포넌트를 찾을 수 없습니다</h1>
              <p class="text-gray-700 mb-2">찾으려는 레이아웃 컴포넌트: <strong>${layoutComponentName}</strong></p>
              ${!component ? '<p class="text-sm text-gray-600 mb-4">컴포넌트가 존재하지 않습니다</p>' : ''}
              ${component && !componentCode ? '<p class="text-sm text-gray-600 mb-4">컴포넌트 코드가 없습니다</p>' : ''}
              <div class="text-left bg-white p-4 rounded border mt-4">
                <p class="text-sm font-semibold mb-2">사용 가능한 컴포넌트:</p>
                <ul class="text-sm text-gray-600 list-disc list-inside">
                  ${conversionData.components?.map((c: any) => `<li>${c.component_name || 'Unnamed'}</li>`).join('') || '<li>컴포넌트 없음</li>'}
                </ul>
              </div>
            </div>
          </body>
        </html>
      `;
      iframeDoc.open();
      iframeDoc.write(errorHtml);
      iframeDoc.close();
      return;
    }

    console.log('✅ Component matched:', component.component_name);

    // React 컴포넌트 코드 처리
    let processedCode = componentCode;

    // code가 빈 문자열인 경우 체크
    if (!processedCode || processedCode.trim() === '') {
      console.error('Component code is empty!');
      const errorHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://cdn.tailwindcss.com"></script>
          </head>
          <body class="flex items-center justify-center min-h-screen bg-yellow-50">
            <div class="text-center p-8 max-w-2xl">
              <h1 class="text-2xl font-bold text-yellow-600 mb-4">컴포넌트 코드가 비어있습니다</h1>
              <p class="text-gray-700 mb-2">컴포넌트 이름: <strong>${component.component_name}</strong></p>
              <p class="text-sm text-gray-600 mb-4">컴포넌트는 존재하지만 코드가 비어있습니다.</p>
            </div>
          </body>
        </html>
      `;
      iframeDoc.open();
      iframeDoc.write(errorHtml);
      iframeDoc.close();
      return;
    }

    // import 문 제거
    processedCode = processedCode.replace(/import\s+.*?from\s+['"].*?['"];?\s*/g, '');

    // 컴포넌트 이름 추출
    let componentName = component.component_name || 'GeneratedComponent';

    const exportDefaultFunctionMatch = processedCode.match(/export\s+default\s+function\s+(\w+)/);
    if (exportDefaultFunctionMatch) {
      componentName = exportDefaultFunctionMatch[1];
      processedCode = processedCode.replace(/export\s+default\s+/, '');
    }

    const exportDefaultMatch = processedCode.match(/export\s+default\s+(\w+);?/);
    if (exportDefaultMatch) {
      componentName = exportDefaultMatch[1];
      processedCode = processedCode.replace(/export\s+default\s+\w+;?\s*$/, '');
    }

    const functionMatch = processedCode.match(/function\s+(\w+)/);
    if (functionMatch && !exportDefaultFunctionMatch) {
      componentName = functionMatch[1];
    }

    const constMatch = processedCode.match(/const\s+(\w+)\s*=/);
    if (constMatch && !functionMatch) {
      componentName = constMatch[1];
    }

    // 슬라이드 데이터를 props로 전달
    let slideData = currentSlide.data || {};

    // data가 배열이면 첫 번째 요소 사용
    if (Array.isArray(slideData) && slideData.length > 0) {
      slideData = slideData[0];
    }

    console.log('📊 Slide Data being passed as props:', slideData);

    // HTML 생성
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
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: system-ui, -apple-system, sans-serif;
              overflow: auto;
              background: white;
            }
          </style>
        </head>
        <body>
          <div id="root"></div>
          <div id="error-display" style="display: none; padding: 20px; background: #ffeeee; color: #cc0000; font-family: monospace; white-space: pre-wrap; border: 2px solid #cc0000; margin: 20px;"></div>

          <script>
            window.onerror = function(msg, url, lineNo, columnNo, error) {
              const errorDiv = document.getElementById('error-display');
              errorDiv.style.display = 'block';
              errorDiv.textContent = 'Error: ' + msg + '\\nLine: ' + lineNo + '\\n\\n' + (error ? error.stack : '');
              return false;
            };
          </script>

          <script type="text/babel">
            const { useState, useEffect } = React;

            (function() {
              try {
                const data = ${JSON.stringify(slideData)};

                ${processedCode}

                const rootElement = document.getElementById('root');
                const root = ReactDOM.createRoot(rootElement);
                root.render(React.createElement(${componentName}, { data: data }));
              } catch (error) {
                console.error('Rendering error:', error);
                const errorDiv = document.getElementById('error-display');
                errorDiv.style.display = 'block';
                errorDiv.textContent = 'Rendering Error:\\n\\n' + error.message + '\\n\\nStack:\\n' + error.stack;
              }
            })();
          </script>
        </body>
      </html>
    `;

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();
  }, [conversionData, currentSlideIndex]);

  const handlePrevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const handleNextSlide = () => {
    const totalSlides = conversionData?.slides?.length || 0;
    if (currentSlideIndex < totalSlides - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevSlide();
      } else if (e.key === 'ArrowRight') {
        handleNextSlide();
      } else if (e.key === 'Escape') {
        navigate('/admin/materials-v2');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlideIndex, conversionData]);

  const totalSlides = conversionData?.slides?.length || 0;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-white" />
          <p className="text-white">수업 자료를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!conversionData || totalSlides === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-center space-y-4">
          <p className="text-xl text-white">수업 자료를 찾을 수 없습니다</p>
          <Button onClick={() => navigate('/admin/materials-v2')}>
            목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-black">
      {/* 상단 툴바 */}
      <div className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/materials-v2')}
            className="text-white hover:bg-gray-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            목록으로
          </Button>
          <div className="h-6 w-px bg-gray-700"></div>
          <h1 className="text-lg font-bold">{conversionData?.content_name || '자료 미리보기'}</h1>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/admin/materials-v2/editor/${id}`)}
            className="text-white hover:bg-gray-800"
          >
            <Edit className="w-4 h-4 mr-2" />
            수정하기
          </Button>

          <div className="h-6 w-px bg-gray-700"></div>

          <span className="text-sm text-gray-400">
            {currentSlideIndex + 1} / {totalSlides}
          </span>
        </div>
      </div>

      {/* 메인 영역 */}
      <div className="flex-1 relative bg-black overflow-hidden">
        {/* iframe - 전체 화면 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="bg-white shadow-2xl"
            style={{
              width: '1280px',
              height: '720px',
              maxWidth: '100vw',
              maxHeight: 'calc(100vh - 60px)'
            }}
          >
            <iframe
              ref={iframeRef}
              className="w-full h-full border-0"
              title={`slide-${currentSlideIndex + 1}`}
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>

        {/* 네비게이션 버튼 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevSlide}
          disabled={currentSlideIndex === 0}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 hover:bg-white disabled:opacity-30 shadow-lg"
          title="이전 슬라이드 (←)"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextSlide}
          disabled={currentSlideIndex === totalSlides - 1}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 hover:bg-white disabled:opacity-30 shadow-lg"
          title="다음 슬라이드 (→)"
        >
          <ChevronRight className="w-6 h-6" />
        </Button>

        {/* 하단 페이지 인디케이터 */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900/80 backdrop-blur">
          {conversionData.slides.map((_: any, index: number) => (
            <button
              key={index}
              onClick={() => setCurrentSlideIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentSlideIndex
                  ? 'bg-white w-8'
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              title={`슬라이드 ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* 단축키 안내 */}
      <div className="absolute bottom-4 right-4 text-xs text-gray-500 bg-gray-900/80 backdrop-blur px-3 py-2 rounded z-10">
        ← → : 슬라이드 이동 | ESC : 나가기
      </div>
    </div>
  );
}
