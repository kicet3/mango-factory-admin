import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Save,
  Code,
  Database,
  Trash2,
  Image as ImageIcon,
  Type,
  Move,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Layers,
  Plus,
  Undo,
  Redo,
  Upload,
  Sparkles,
  Send,
  Eye,
  X,
  Paperclip
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface EditableElement {
  id: string;
  element: HTMLElement;
  originalProps: {
    position: string;
    left: string;
    top: string;
    width: string;
    height: string;
    backgroundColor: string;
    color: string;
    fontSize: string;
    fontWeight: string;
    textAlign: string;
  };
}

interface Page {
  id: number;
  name: string;
  reactCode: string;
  jsonData: string;
  componentId?: number; // API의 component ID
  slideId?: number; // API의 slide ID
  propDataType?: any; // API의 component prop_data_type
}

interface HistoryState {
  reactCode: string;
  jsonData: string;
  timestamp: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export default function WixStyleEditor() {
  const { id } = useParams();
  const navigate = useNavigate();

  // 페이지 관리
  const [pages, setPages] = useState<Page[]>([
    {
      id: 1,
      name: '페이지 1',
      reactCode: '',
      jsonData: '{}'
    }
  ]);
  const [currentPageId, setCurrentPageId] = useState<number>(1);

  // 현재 편집 중인 코드와 데이터
  const [reactCode, setReactCode] = useState('');
  const [jsonData, setJsonData] = useState('{}');
  const [propDataType, setPropDataType] = useState<any>(null);

  // 되돌리기/다시실행 히스토리
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoAction = useRef(false);

  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [renderedElements, setRenderedElements] = useState<Map<string, EditableElement>>(new Map());

  // 편집 중인 속성값 (저장 전)
  const [editingStyles, setEditingStyles] = useState<{
    position: string;
    left: string;
    top: string;
    width: string;
    height: string;
    backgroundColor: string;
    color: string;
    fontSize: string;
    fontWeight: string;
    textAlign: string;
    display: string;
    alignItems: string;
    justifyContent: string;
    textContent: string;
    imageSrc: string;
  } | null>(null);

  // 이미지 업로드
  const imageInputRef = useRef<HTMLInputElement>(null);

  // 이미지 갤러리
  const [availableImages, setAvailableImages] = useState<string[]>([]);
  const [isImageGalleryOpen, setIsImageGalleryOpen] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);

  // 왼쪽 패널 토글 상태
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);

  // AI 채팅 관련 상태
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // 페이지 로딩 중인지 추적 (무한 루프 방지)
  const isLoadingPageRef = useRef(false);

  // Conversion 데이터 및 현재 컴포넌트 추적
  const [conversionData, setConversionData] = useState<any>(null);
  const [currentComponentId, setCurrentComponentId] = useState<number | null>(null);

  // 자료 정보 편집
  const [contentName, setContentName] = useState('');
  const [description, setDescription] = useState('');
  const [isEditingInfo, setIsEditingInfo] = useState(false);

  // AI 수정된 최신 코드 추적
  const [latestAIModifiedCode, setLatestAIModifiedCode] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // AI 편집 모드 ('code' 또는 'data')
  const [aiEditMode, setAiEditMode] = useState<'code' | 'data'>('code');

  // 미리보기 모달
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // 파일 업로드
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        // 새 자료 생성 모드 - 세션 스토리지에서 데이터 로드 (기존 로직 유지)
        return;
      }

      // 기존 자료 수정 모드 - API에서 데이터 로드
      try {
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

        // Conversion 데이터 저장
        setConversionData(data);

        // 자료 정보 설정
        setContentName(data.content_name || '');
        setDescription(data.description || '');

        // 컴포넌트 맵 생성 (component_name -> {code, id, propDataType})
        const componentMap = new Map<string, { code: string; id: number; propDataType: any }>();
        if (data.components && data.components.length > 0) {
          data.components.forEach((comp: any) => {
            const fullCode = comp.imports && comp.imports.length > 0
              ? `${comp.imports.join('\n')}\n\n${comp.code}`
              : comp.code;
            componentMap.set(comp.component_name, {
              code: fullCode,
              id: comp.id,
              propDataType: comp.prop_data_type
            });
            console.log(`📦 컴포넌트 등록: ${comp.component_name} (ID: ${comp.id}, ${fullCode.length} chars)`);
          });
        }

        // 슬라이드 데이터로 pages 배열 생성 (각 슬라이드의 layout_component와 매칭)
        if (data.slides && data.slides.length > 0) {
          const newPages: Page[] = data.slides.map((slide: any, index: number) => {
            const layoutComponent = slide.layout_component;
            const matched = componentMap.get(layoutComponent);

            console.log(`📄 슬라이드 ${index + 1}: layout_component="${layoutComponent}" → 컴포넌트 ID=${matched?.id}, 코드 길이=${matched?.code.length || 0}`);

            return {
              id: index + 1,
              name: `페이지 ${index + 1}`,
              reactCode: matched?.code || '', // layout_component와 매칭된 React 코드
              jsonData: JSON.stringify(slide.data, null, 2),
              componentId: matched?.id, // 컴포넌트 ID 저장
              slideId: slide.id, // 슬라이드 ID 저장
              propDataType: matched?.propDataType // prop_data_type 저장
            };
          });

          console.log('📚 생성된 페이지 수:', newPages.length);
          console.log('📄 첫 번째 페이지 JSON 데이터:', newPages[0].jsonData);

          isLoadingPageRef.current = true;
          setPages(newPages);
          setCurrentPageId(1);
          setReactCode(newPages[0].reactCode);
          setJsonData(newPages[0].jsonData);
          setCurrentComponentId(newPages[0].componentId || null);
          setPropDataType(newPages[0].propDataType || null);

          setTimeout(() => {
            isLoadingPageRef.current = false;
          }, 100);
        }

        toast.success('변환 데이터를 불러왔습니다');
      } catch (error) {
        console.error('❌ 변환 데이터 로드 실패:', error);
        toast.error('데이터를 불러오는데 실패했습니다');
      }
    };

    loadConversionData();
  }, [id]);

  // 초기 로드: 세션 스토리지에서 새로 생성된 자료 데이터 가져오기
  useEffect(() => {
    if (id === 'new') {
      const storedData = sessionStorage.getItem('newMaterialData');
      if (storedData) {
        try {
          const materialData = JSON.parse(storedData);
          console.log('📦 세션 스토리지에서 자료 로드:', materialData);

          // 자료 메타 정보 설정
          setContentName(materialData.name || '새 수업자료');
          setDescription(materialData.description || '');

          // 슬라이드 데이터를 페이지로 변환
          if (materialData.components && materialData.slidesData) {
            const newPages: Page[] = materialData.components.map((component: string, index: number) => {
              const slideData = materialData.slidesData[index] || {};
              return {
                id: index + 1,
                name: `페이지 ${index + 1}`,
                reactCode: component,
                jsonData: JSON.stringify(slideData, null, 2)
              };
            });

            if (newPages.length > 0) {
              setPages(newPages);
              setCurrentPageId(1);
              setReactCode(newPages[0].reactCode);
              setJsonData(newPages[0].jsonData);

              toast.success(`${newPages.length}개 페이지가 로드되었습니다.`);
            }
          }

          // 사용 후 세션 스토리지 정리
          sessionStorage.removeItem('newMaterialData');
        } catch (error) {
          console.error('세션 스토리지 데이터 파싱 오류:', error);
          toast.error('자료 로드 중 오류가 발생했습니다.');
        }
      }
    }
  }, [id]);

  // 페이지 변경 시 reactCode와 jsonData 업데이트
  useEffect(() => {
    const page = pages.find(p => p.id === currentPageId);
    if (page) {
      console.log('🔄 페이지 변경:', currentPageId);
      console.log('📝 로드된 코드 길이:', page.reactCode.length);
      console.log('📊 로드된 JSON:', page.jsonData);
      console.log('🆔 컴포넌트 ID:', page.componentId);

      isLoadingPageRef.current = true;
      setReactCode(page.reactCode);
      setJsonData(page.jsonData);
      setCurrentComponentId(page.componentId || null);
      setPropDataType(page.propDataType || null);
      setSelectedElementId(null);
      setEditingStyles(null);

      // AI 편집 상태 초기화
      setChatMessages([]);
      setChatInput('');
      setLatestAIModifiedCode(null);
      setHasUnsavedChanges(false);
      setUploadedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // 다음 틱에서 플래그 해제
      setTimeout(() => {
        isLoadingPageRef.current = false;
        console.log('✅ 페이지 로드 완료');
      }, 0);
    }
  }, [currentPageId]);

  // reactCode나 jsonData 변경 시 현재 페이지 업데이트 (페이지 로딩 중이 아닐 때만)
  useEffect(() => {
    if (!isLoadingPageRef.current) {
      console.log('💾 페이지 저장:', currentPageId);
      console.log('📝 저장된 코드 길이:', reactCode.length);
      console.log('📊 저장된 JSON:', jsonData);

      setPages(prev => prev.map(page =>
        page.id === currentPageId
          ? { ...page, reactCode, jsonData }
          : page
      ));
    }
  }, [reactCode, jsonData, currentPageId]);

  // 페이지 추가
  const addPage = () => {
    const newId = Math.max(...pages.map(p => p.id)) + 1;
    const newPage: Page = {
      id: newId,
      name: `페이지 ${newId}`,
      reactCode: '',
      jsonData: '{}'
    };
    setPages(prev => [...prev, newPage]);
    setCurrentPageId(newId);
    toast.success('새 페이지가 추가되었습니다');
  };

  // 페이지 삭제
  const deletePage = (pageId: number) => {
    if (pages.length === 1) {
      toast.error('마지막 페이지는 삭제할 수 없습니다');
      return;
    }
    setPages(prev => prev.filter(p => p.id !== pageId));
    if (currentPageId === pageId) {
      const remainingPages = pages.filter(p => p.id !== pageId);
      setCurrentPageId(remainingPages[0].id);
    }
    toast.success('페이지가 삭제되었습니다');
  };

  // reactCode나 jsonData 변경 시 히스토리 저장
  useEffect(() => {
    if (!isLoadingPageRef.current && reactCode && !isUndoRedoAction.current) {
      const timeoutId = setTimeout(() => {
        // 히스토리에 현재 상태 추가
        const newState: HistoryState = {
          reactCode,
          jsonData,
          timestamp: Date.now()
        };

        // 현재 인덱스 이후의 히스토리 제거 (새로운 변경사항)
        setHistory(prev => {
          const newHistory = prev.slice(0, historyIndex + 1);
          newHistory.push(newState);

          // 최대 50개 히스토리 유지
          if (newHistory.length > 50) {
            newHistory.shift();
            setHistoryIndex(49);
            return newHistory;
          } else {
            setHistoryIndex(newHistory.length - 1);
            return newHistory;
          }
        });
      }, 500); // 500ms 디바운스
      return () => clearTimeout(timeoutId);
    }
  }, [reactCode, jsonData, historyIndex]);

  // 되돌리기 (Undo)
  const handleUndo = () => {
    if (historyIndex > 0) {
      isUndoRedoAction.current = true;
      const prevState = history[historyIndex - 1];
      setReactCode(prevState.reactCode);
      setJsonData(prevState.jsonData);
      setHistoryIndex(historyIndex - 1);
      setTimeout(() => {
        isUndoRedoAction.current = false;
      }, 100);
      toast.success('되돌리기 완료');
    } else {
      toast.error('더 이상 되돌릴 수 없습니다');
    }
  };

  // 다시실행 (Redo)
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      isUndoRedoAction.current = true;
      const nextState = history[historyIndex + 1];
      setReactCode(nextState.reactCode);
      setJsonData(nextState.jsonData);
      setHistoryIndex(historyIndex + 1);
      setTimeout(() => {
        isUndoRedoAction.current = false;
      }, 100);
      toast.success('다시실행 완료');
    } else {
      toast.error('더 이상 다시실행할 수 없습니다');
    }
  };

  // 키보드 단축키 (Ctrl+Z, Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z (되돌리기)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl+Shift+Z (다시실행)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      }
      // Ctrl+Y (다시실행 - Windows)
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  // JSON 데이터 파싱
  const parsedData = React.useMemo(() => {
    try {
      return JSON.parse(jsonData);
    } catch {
      return {};
    }
  }, [jsonData]);

  // React 코드를 실제로 렌더링
  useEffect(() => {
    if (!reactCode.trim() || !iframeRef.current) return;

    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) return;

    // React 코드 정리 및 컴포넌트 이름 추출
    let processedCode = reactCode;

    // import 문 제거
    processedCode = processedCode.replace(/import\s+.*?from\s+['"].*?['"];?\s*/g, '');

    // export 문 제거 및 컴포넌트 이름 추출
    let componentName = 'GeneratedComponent';

    // export default function ComponentName 형태
    const exportDefaultFunctionMatch = processedCode.match(/export\s+default\s+function\s+(\w+)/);
    if (exportDefaultFunctionMatch) {
      componentName = exportDefaultFunctionMatch[1];
      processedCode = processedCode.replace(/export\s+default\s+/, '');
    }

    // export default ComponentName 형태
    const exportDefaultMatch = processedCode.match(/export\s+default\s+(\w+);?/);
    if (exportDefaultMatch) {
      componentName = exportDefaultMatch[1];
      processedCode = processedCode.replace(/export\s+default\s+\w+;?\s*$/, '');
    }

    // function ComponentName 형태 (export가 없는 경우)
    const functionMatch = processedCode.match(/function\s+(\w+)/);
    if (functionMatch && !exportDefaultFunctionMatch) {
      componentName = functionMatch[1];
    }

    // const ComponentName = 형태
    const constMatch = processedCode.match(/const\s+(\w+)\s*=/);
    if (constMatch && !functionMatch) {
      componentName = constMatch[1];
    }

    // JSX 주석은 제거하지 않음 (Babel이 처리함)

    console.log('Component name detected:', componentName);
    console.log('Processed code length:', processedCode.length);

    // HTML 생성
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">

          <!-- Tailwind CSS -->
          <script src="https://cdn.tailwindcss.com"></script>

          <!-- React -->
          <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
          <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>

          <!-- Babel Standalone -->
          <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: system-ui, -apple-system, sans-serif; overflow: auto; }
            .editable-element {
              cursor: move;
              transition: outline 0.2s;
            }
            .editable-element:hover {
              outline: 2px solid rgba(139, 195, 74, 0.5) !important;
              outline-offset: 2px;
            }
            .editable-element.selected {
              outline: 3px solid #8BC34A !important;
              outline-offset: 2px;
              z-index: 1000;
              position: relative;
            }
            .resize-handle {
              position: absolute;
              width: 10px;
              height: 10px;
              background: #8BC34A;
              border: 2px solid white;
              z-index: 1001;
            }
            .resize-handle.nw { top: -5px; left: -5px; cursor: nw-resize; }
            .resize-handle.ne { top: -5px; right: -5px; cursor: ne-resize; }
            .resize-handle.sw { bottom: -5px; left: -5px; cursor: sw-resize; }
            .resize-handle.se { bottom: -5px; right: -5px; cursor: se-resize; }
            .resize-handle.n { top: -5px; left: 50%; transform: translateX(-50%); cursor: n-resize; }
            .resize-handle.s { bottom: -5px; left: 50%; transform: translateX(-50%); cursor: s-resize; }
            .resize-handle.w { top: 50%; left: -5px; transform: translateY(-50%); cursor: w-resize; }
            .resize-handle.e { top: 50%; right: -5px; transform: translateY(-50%); cursor: e-resize; }
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
              console.error('Global error:', msg, error);
              return false;
            };
          </script>

          <script type="text/babel">
            const { useState, useEffect } = React;

            (function() {
              try {
                console.log('Starting render...');
                const data = ${JSON.stringify(parsedData)};
                console.log('Data loaded:', data);

                ${processedCode}

                console.log('Component loaded:', typeof ${componentName});

                // 렌더링
                const rootElement = document.getElementById('root');
                console.log('Root element:', rootElement);

                const root = ReactDOM.createRoot(rootElement);
                root.render(React.createElement(${componentName}, { data: data }));

                console.log('Render initiated');

                // 편집 가능한 요소에 ID 추가 및 드래그 기능
                setTimeout(() => {
                  console.log('Adding element IDs and drag functionality...');
                  const allDivs = document.querySelectorAll('div');
                  let elementIndex = 0;

                  allDivs.forEach((div) => {
                    if (div.id !== 'root' && div.id !== 'error-display') {
                      div.setAttribute('data-element-id', 'element-' + elementIndex);
                      div.classList.add('editable-element');
                      elementIndex++;

                      // 클릭 이벤트 및 크기 조절 핸들 추가
                      div.addEventListener('click', (e) => {
                        e.stopPropagation();

                        // 기존 선택 해제
                        document.querySelectorAll('.selected').forEach(el => {
                          el.classList.remove('selected');
                          // 기존 핸들 제거
                          el.querySelectorAll('.resize-handle').forEach(h => h.remove());
                        });

                        div.classList.add('selected');

                        // 크기 조절 핸들 추가
                        const handles = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
                        handles.forEach(pos => {
                          const handle = document.createElement('div');
                          handle.className = \`resize-handle \${pos}\`;
                          handle.setAttribute('data-position', pos);
                          div.appendChild(handle);
                        });

                        window.parent.postMessage({
                          type: 'ELEMENT_SELECTED',
                          elementId: div.getAttribute('data-element-id')
                        }, '*');
                      });

                      // 드래그 및 리사이즈 기능
                      let isDragging = false;
                      let isResizing = false;
                      let resizeDirection = '';
                      let startX = 0;
                      let startY = 0;
                      let initialLeft = 0;
                      let initialTop = 0;
                      let initialWidth = 0;
                      let initialHeight = 0;

                      div.addEventListener('mousedown', (e) => {
                        const target = e.target;

                        // 리사이즈 핸들 클릭
                        if (target.classList.contains('resize-handle')) {
                          isResizing = true;
                          resizeDirection = target.getAttribute('data-position');

                          startX = e.clientX;
                          startY = e.clientY;

                          const style = window.getComputedStyle(div);
                          initialLeft = parseInt(style.left) || 0;
                          initialTop = parseInt(style.top) || 0;
                          initialWidth = parseInt(style.width) || 0;
                          initialHeight = parseInt(style.height) || 0;

                          e.preventDefault();
                          e.stopPropagation();
                          return;
                        }

                        // 일반 드래그 (요소가 선택되어 있고 핸들이 아닌 경우)
                        if (!div.classList.contains('selected')) return;

                        isDragging = true;
                        startX = e.clientX;
                        startY = e.clientY;

                        const style = window.getComputedStyle(div);
                        initialLeft = parseInt(style.left) || 0;
                        initialTop = parseInt(style.top) || 0;

                        // position이 static이면 absolute로 변경
                        if (style.position === 'static' || style.position === 'relative') {
                          div.style.position = 'absolute';
                        }

                        e.preventDefault();
                        e.stopPropagation();
                      });

                      document.addEventListener('mousemove', (e) => {
                        const deltaX = e.clientX - startX;
                        const deltaY = e.clientY - startY;

                        if (isResizing) {
                          // 크기 조절
                          if (resizeDirection.includes('e')) {
                            div.style.width = (initialWidth + deltaX) + 'px';
                          }
                          if (resizeDirection.includes('w')) {
                            div.style.width = (initialWidth - deltaX) + 'px';
                            div.style.left = (initialLeft + deltaX) + 'px';
                          }
                          if (resizeDirection.includes('s')) {
                            div.style.height = (initialHeight + deltaY) + 'px';
                          }
                          if (resizeDirection.includes('n')) {
                            div.style.height = (initialHeight - deltaY) + 'px';
                            div.style.top = (initialTop + deltaY) + 'px';
                          }
                        } else if (isDragging) {
                          // 위치 이동
                          const newLeft = initialLeft + deltaX;
                          const newTop = initialTop + deltaY;

                          div.style.left = newLeft + 'px';
                          div.style.top = newTop + 'px';
                        }
                      });

                      document.addEventListener('mouseup', (e) => {
                        if (isDragging || isResizing) {
                          const style = window.getComputedStyle(div);

                          window.parent.postMessage({
                            type: isResizing ? 'ELEMENT_RESIZED' : 'ELEMENT_MOVED',
                            elementId: div.getAttribute('data-element-id'),
                            left: style.left,
                            top: style.top,
                            width: style.width,
                            height: style.height
                          }, '*');
                        }

                        isDragging = false;
                        isResizing = false;
                        resizeDirection = '';
                      });
                    }
                  });

                  console.log('Total editable elements:', elementIndex);
                }, 500);
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
  }, [reactCode, parsedData]);

  // iframe에서 메시지 수신
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'ELEMENT_SELECTED') {
        const elementId = event.data.elementId;
        setSelectedElementId(elementId);

        // 요소 선택 시 자동으로 속성 불러오기
        setTimeout(() => {
          if (iframeRef.current) {
            const iframeDoc = iframeRef.current.contentDocument;
            if (!iframeDoc) return;

            const element = iframeDoc.querySelector(`[data-element-id="${elementId}"]`);
            if (!element) return;

            const computedStyle = element.ownerDocument?.defaultView?.getComputedStyle(element);
            if (!computedStyle) return;

            // 이미지 태그인지 확인
            const isImage = element.tagName.toLowerCase() === 'img';
            const imageSrc = isImage ? (element as HTMLImageElement).src : '';

            // 텍스트 내용 (이미지가 아닌 경우에만)
            const textContent = !isImage ? ((element as HTMLElement).textContent || '') : '';

            const loadedStyles = {
              position: computedStyle.position,
              left: computedStyle.left,
              top: computedStyle.top,
              width: computedStyle.width,
              height: computedStyle.height,
              backgroundColor: computedStyle.backgroundColor,
              color: computedStyle.color,
              fontSize: computedStyle.fontSize,
              fontWeight: computedStyle.fontWeight || 'normal',
              textAlign: computedStyle.textAlign,
              display: computedStyle.display || 'block',
              alignItems: computedStyle.alignItems || 'flex-start',
              justifyContent: computedStyle.justifyContent || 'flex-start',
              textContent: textContent,
              imageSrc: imageSrc
            };

            setEditingStyles(loadedStyles);
            console.log('Auto-loaded element styles');
          }
        }, 50);
      } else if (event.data.type === 'ELEMENT_MOVED') {
        // 드래그로 요소가 이동되었을 때
        const { elementId, left, top } = event.data;
        console.log('Element moved:', elementId, 'to', left, top);

        // 편집 중인 스타일이 있으면 업데이트
        if (editingStyles && selectedElementId === elementId) {
          setEditingStyles({
            ...editingStyles,
            left: left,
            top: top
          });
        }

        // React 코드에 즉시 반영
        updateReactCodePosition(elementId, left, top);
      } else if (event.data.type === 'ELEMENT_RESIZED') {
        // 크기 조절
        const { elementId, left, top, width, height } = event.data;
        console.log('Element resized:', elementId, width, height);

        // 편집 중인 스타일이 있으면 업데이트
        if (editingStyles && selectedElementId === elementId) {
          setEditingStyles({
            ...editingStyles,
            left: left,
            top: top,
            width: width,
            height: height
          });
        }

        // React 코드에 즉시 반영
        updateReactCodeSizeAndPosition(elementId, left, top, width, height);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [editingStyles, selectedElementId]);

  // 선택된 요소 가져오기
  const getSelectedElement = (): HTMLElement | null => {
    if (!selectedElementId || !iframeRef.current) return null;

    const iframeDoc = iframeRef.current.contentDocument;
    if (!iframeDoc) return null;

    return iframeDoc.querySelector(`[data-element-id="${selectedElementId}"]`);
  };

  // 드래그로 이동된 위치를 React 코드에 반영
  const updateReactCodePosition = (elementId: string, left: string, top: string) => {
    const elementIndex = parseInt(elementId.replace('element-', ''));
    if (isNaN(elementIndex)) return;

    console.log('Updating position in code:', elementId, left, top);

    const lines = reactCode.split('\n');
    let divCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.includes('<div') && !line.trim().startsWith('//') && !line.trim().startsWith('/*')) {
        if (divCount === elementIndex) {
          const styleMatch = line.match(/style=\{\{([^}]*)\}\}/);

          if (styleMatch) {
            let styleContent = styleMatch[1].trim();
            const styleObj: any = {};

            // 기존 스타일 파싱
            const stylePairs = styleContent.split(',').map(s => s.trim());
            stylePairs.forEach(pair => {
              const match = pair.match(/(\w+):\s*['"]([^'"]+)['"]/);
              if (match) {
                styleObj[match[1]] = match[2];
              }
            });

            // 위치만 업데이트
            styleObj.left = left;
            styleObj.top = top;

            const newStyleContent = Object.entries(styleObj)
              .map(([k, v]) => `${k}: '${v}'`)
              .join(', ');

            lines[i] = line.replace(/style=\{\{[^}]*\}\}/, `style={{ ${newStyleContent} }}`);
            console.log('Updated position in code');
          }

          break;
        }
        divCount++;
      }
    }

    const updatedCode = lines.join('\n');
    setReactCode(updatedCode);
  };

  // 크기와 위치를 함께 React 코드에 반영
  const updateReactCodeSizeAndPosition = (elementId: string, left: string, top: string, width: string, height: string) => {
    const elementIndex = parseInt(elementId.replace('element-', ''));
    if (isNaN(elementIndex)) return;

    console.log('Updating size and position in code:', elementId, left, top, width, height);

    const lines = reactCode.split('\n');
    let divCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.includes('<div') && !line.trim().startsWith('//') && !line.trim().startsWith('/*')) {
        if (divCount === elementIndex) {
          const styleMatch = line.match(/style=\{\{([^}]*)\}\}/);

          if (styleMatch) {
            let styleContent = styleMatch[1].trim();
            const styleObj: any = {};

            // 기존 스타일 파싱
            const stylePairs = styleContent.split(',').map(s => s.trim());
            stylePairs.forEach(pair => {
              const match = pair.match(/(\w+):\s*['"]([^'"]+)['"]/);
              if (match) {
                styleObj[match[1]] = match[2];
              }
            });

            // 위치와 크기 업데이트
            styleObj.left = left;
            styleObj.top = top;
            styleObj.width = width;
            styleObj.height = height;

            const newStyleContent = Object.entries(styleObj)
              .map(([k, v]) => `${k}: '${v}'`)
              .join(', ');

            lines[i] = line.replace(/style=\{\{[^}]*\}\}/, `style={{ ${newStyleContent} }}`);
            console.log('Updated size and position in code');
          }

          break;
        }
        divCount++;
      }
    }

    const updatedCode = lines.join('\n');
    setReactCode(updatedCode);
  };

  // S3/백엔드에서 이미지 목록 가져오기
  const loadImageGallery = async () => {
    try {
      setLoadingImages(true);

      // TODO: 실제 API 엔드포인트로 교체
      // const response = await fetch('/api/images');
      // const data = await response.json();
      // setAvailableImages(data.images);

      // 임시: Supabase Storage 또는 더미 데이터
      // Supabase Storage 예시:
      // const { data, error } = await supabase.storage
      //   .from('images')
      //   .list('materials');
      //
      // if (error) throw error;
      // const imageUrls = data.map(file =>
      //   supabase.storage.from('images').getPublicUrl(`materials/${file.name}`).data.publicUrl
      // );
      // setAvailableImages(imageUrls);

      // 임시 더미 데이터 (실제 구현 시 삭제)
      const dummyImages = [
        'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400',
        'https://images.unsplash.com/photo-1557683316-973673baf926?w=400',
        'https://images.unsplash.com/photo-1581287053822-fd7bf4f4bfec?w=400',
        'https://images.unsplash.com/photo-1516802273409-68526ee1bdd6?w=400',
        'https://images.unsplash.com/photo-1573865526739-10c1de0b3e90?w=400',
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'
      ];

      setAvailableImages(dummyImages);
      setIsImageGalleryOpen(true);
    } catch (error) {
      console.error('Error loading images:', error);
      toast.error('이미지 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoadingImages(false);
    }
  };

  // 갤러리에서 이미지 선택
  const handleImageSelect = (imageUrl: string) => {
    if (editingStyles) {
      updateEditingStyle('imageSrc', imageUrl);
      setIsImageGalleryOpen(false);
      toast.success('이미지가 선택되었습니다.');
    }
  };

  // 이미지 파일 업로드 핸들러
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedElementId) return;

    // 이미지 파일 검증
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    try {
      // TODO: 실제로는 S3에 업로드하고 URL 받아오기
      // const formData = new FormData();
      // formData.append('file', file);
      // const response = await fetch('/api/upload-image', {
      //   method: 'POST',
      //   body: formData
      // });
      // const { url } = await response.json();
      // updateEditingStyle('imageSrc', url);

      // 임시: 파일을 base64로 변환 (실제로는 S3 업로드)
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Image = event.target?.result as string;

        // 편집 스타일 업데이트
        if (editingStyles) {
          updateEditingStyle('imageSrc', base64Image);
        }

        toast.success('이미지가 업로드되었습니다.');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('이미지 업로드 중 오류가 발생했습니다.');
    }
  };

  // AI 채팅 메시지 전송
  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    // Conversion ID와 Component ID 확인
    if (!id || id === 'new') {
      toast.error('저장된 자료만 AI 수정이 가능합니다. 먼저 자료를 저장해주세요.');
      return;
    }

    if (!currentComponentId) {
      toast.error('현재 페이지의 컴포넌트 정보를 찾을 수 없습니다.');
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: chatInput.trim(),
      timestamp: Date.now()
    };

    setChatMessages(prev => [...prev, userMessage]);
    const userRequest = chatInput.trim();
    setChatInput('');
    setIsChatLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      let response;
      let result;

      // 모드에 따라 다른 엔드포인트 사용
      if (aiEditMode === 'data') {
        // 데이터 편집 모드: /data 엔드포인트 사용
        const requestBody = {
          code: reactCode,
          prop_data_type: propDataType,
          user_request: userRequest,
          allow_key_changes: true  // 데이터 키값 변경 허용
        };

        console.log('🤖 AI 데이터 편집 요청:', {
          conversionId: id,
          componentId: currentComponentId,
          request: userRequest,
          propDataType: propDataType,
          requestBody: requestBody
        });

        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        response = await fetch(
          `${API_BASE_URL}/conversions/${id}/components/${currentComponentId}/data`,
          {
            method: 'PUT',
            headers,
            body: JSON.stringify(requestBody),
            mode: 'cors',
          }
        );

        if (!response.ok) {
          throw new Error(`서버 오류: ${response.status} ${response.statusText}`);
        }

        result = await response.json();
        console.log('✅ AI 데이터 편집 결과:', result);

        // 응답에서 수정된 데이터 추출
        const modifiedData = result.data || propDataType;
        const summary = result.summary || '데이터가 수정되었습니다.';

        // 수정된 데이터를 현재 페이지에 반영
        if (modifiedData) {
          const updatedJsonData = JSON.stringify(modifiedData, null, 2);
          setJsonData(updatedJsonData);
          setHasUnsavedChanges(true);

          // pages 배열도 업데이트
          setPages(prev => prev.map(page =>
            page.id === currentPageId
              ? { ...page, jsonData: updatedJsonData }
              : page
          ));

          toast.success('데이터가 성공적으로 수정되었습니다!');
        }

        // AI 응답 메시지 추가
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `✅ ${summary}\n\n데이터가 업데이트되었습니다.`,
          timestamp: Date.now()
        };

        setChatMessages(prev => [...prev, assistantMessage]);

      } else {
        // 코드 수정 모드: /code 엔드포인트 사용
        const formData = new FormData();
        formData.append('user_request', userRequest);
        formData.append('preserve_functionality', 'true');

        // 파일이 있으면 추가
        if (uploadedFile) {
          formData.append('file', uploadedFile);
          console.log('📎 파일 첨부:', uploadedFile.name);
        }

        console.log('🤖 AI 코드 수정 요청:', {
          conversionId: id,
          componentId: currentComponentId,
          request: userRequest,
          hasFile: !!uploadedFile
        });

        // FormData는 Content-Type을 자동으로 설정하므로 헤더에서 제외
        const headers: HeadersInit = {};
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        response = await fetch(
          `${API_BASE_URL}/conversions/${id}/components/${currentComponentId}/code`,
          {
            method: 'PUT',
            headers,
            body: formData,
            mode: 'cors',
          }
        );

        if (!response.ok) {
          throw new Error(`서버 오류: ${response.status} ${response.statusText}`);
        }

        result = await response.json();
        console.log('✅ AI 코드 수정 결과:', result);

        // 응답에서 수정된 코드 추출
        const modifiedCode = result.modified_code || result.code || '';
        const summary = result.summary || '코드가 수정되었습니다.';

        // 수정된 코드를 현재 페이지에 반영
        if (modifiedCode) {
          setReactCode(modifiedCode);
          setLatestAIModifiedCode(modifiedCode);
          setHasUnsavedChanges(true);

          // pages 배열도 업데이트
          setPages(prev => prev.map(page =>
            page.id === currentPageId
              ? { ...page, reactCode: modifiedCode }
              : page
          ));

          toast.success('코드가 성공적으로 수정되었습니다!');
        }

        // AI 응답 메시지 추가
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `✅ ${summary}\n\n변경 사항이 코드에 적용되었습니다.`,
          timestamp: Date.now()
        };

        setChatMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      toast.error(error.message || 'AI 코드 수정 중 오류가 발생했습니다.');

      const errorMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `❌ 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`,
        timestamp: Date.now()
      };

      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
      // 파일 업로드 초기화
      setUploadedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 자료 정보 업데이트
  const handleUpdateConversionInfo = async () => {
    if (!id || id === 'new') {
      toast.error('저장된 자료만 업데이트할 수 있습니다.');
      return;
    }

    try {
      const headers = await getAuthHeaders();

      console.log('💾 자료 정보 업데이트 중:', {
        conversionId: id,
        content_name: contentName,
        description: description
      });

      const body = JSON.stringify({
        content_name: contentName,
        description: description
      });

      const response = await fetch(
        `${API_BASE_URL}/conversions/${id}`,
        {
          method: 'PATCH',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: body,
          mode: 'cors',
        }
      );

      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ 자료 정보 저장 완료:', result);

      setIsEditingInfo(false);
      toast.success('자료 정보가 저장되었습니다!');
    } catch (error: any) {
      console.error('Update info error:', error);
      toast.error(error.message || '저장 중 오류가 발생했습니다.');
    }
  };

  // 서버에 코드와 데이터 저장
  const handleSaveToServer = async () => {
    if (!id || id === 'new') {
      toast.error('저장된 자료만 업데이트할 수 있습니다.');
      return;
    }

    if (!currentComponentId) {
      toast.error('현재 페이지의 컴포넌트 정보를 찾을 수 없습니다.');
      return;
    }

    if (!latestAIModifiedCode && !hasUnsavedChanges) {
      toast.error('저장할 변경사항이 없습니다.');
      return;
    }

    try {
      const headers = await getAuthHeaders();

      // 모드에 따라 다른 저장 처리
      if (aiEditMode === 'data') {
        // 데이터 편집 모드: /data 엔드포인트 사용
        console.log('💾 서버에 데이터 저장 중:', {
          conversionId: id,
          componentId: currentComponentId,
          propDataType: propDataType
        });

        // PATCH 요청으로 데이터 전달
        const params = new URLSearchParams({
          component_id: currentComponentId?.toString() || '',
          prop_data_type: JSON.stringify(propDataType)
        });

        const response = await fetch(
          `${API_BASE_URL}/conversions/${id}/components/${currentComponentId}/data?${params}`,
          {
            method: 'PATCH',
            headers,
            mode: 'cors',
          }
        );

        if (!response.ok) {
          throw new Error(`서버 오류: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ 서버 데이터 저장 완료:', result);

        // 응답에서 modified_data를 받아서 업데이트
        if (result.modified_data) {
          const updatedJsonData = JSON.stringify(result.modified_data, null, 2);
          setJsonData(updatedJsonData);

          // pages 배열도 업데이트
          setPages(prev => prev.map(page =>
            page.id === currentPageId
              ? { ...page, jsonData: updatedJsonData }
              : page
          ));

          console.log('📝 데이터 업데이트 완료:', {
            dataKeys: Object.keys(result.modified_data)
          });
        }

        setHasUnsavedChanges(false);
        toast.success('데이터가 서버에 저장되었습니다!');

      } else {
        // 코드 수정 모드: /code 엔드포인트 사용
        const codeToSave = latestAIModifiedCode || reactCode;

        console.log('💾 서버에 코드 저장 중:', {
          conversionId: id,
          componentId: currentComponentId,
          codeLength: codeToSave.length
        });

        // PATCH 요청으로 modified_code 전달
        const params = new URLSearchParams({
          modified_code: codeToSave
        });

        const response = await fetch(
          `${API_BASE_URL}/conversions/${id}/components/${currentComponentId}/code?${params}`,
          {
            method: 'PATCH',
            headers,
            mode: 'cors',
          }
        );

        if (!response.ok) {
          throw new Error(`서버 오류: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ 서버 코드 저장 완료:', result);

        setHasUnsavedChanges(false);
        toast.success('코드가 서버에 저장되었습니다!');
      }
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || '저장 중 오류가 발생했습니다.');
    }
  };

  // 파일 업로드 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      toast.success(`파일 "${file.name}"이 첨부되었습니다.`);
    }
  };

  // 파일 제거 핸들러
  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.info('파일이 제거되었습니다.');
  };

  // 채팅 스크롤 자동 이동
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // 편집 중인 스타일 값 변경 (임시 저장) 및 실시간 미리보기
  const updateEditingStyle = (property: keyof typeof editingStyles, value: string) => {
    if (!editingStyles) return;

    // 편집 상태 업데이트
    setEditingStyles({
      ...editingStyles,
      [property]: value
    });

    // 실시간으로 iframe에 반영
    const element = getSelectedElement();
    if (element) {
      if (property === 'textContent') {
        element.textContent = value;
      } else if (property === 'imageSrc') {
        // 이미지 src 업데이트
        if (element.tagName.toLowerCase() === 'img') {
          (element as HTMLImageElement).src = value;
        }
      } else if (property === 'left' || property === 'top' || property === 'width' || property === 'height') {
        element.style[property] = value;
      } else if (property === 'backgroundColor' || property === 'color' || property === 'fontSize' || property === 'fontWeight' || property === 'textAlign' || property === 'display' || property === 'alignItems' || property === 'justifyContent') {
        element.style[property as any] = value;
      }
    }
  };

  // 저장 버튼 - 변경사항을 실제로 적용
  const saveStyleChanges = async () => {
    if (!editingStyles || !selectedElementId) {
      toast.error('저장할 변경사항이 없습니다');
      return;
    }

    const element = getSelectedElement();
    if (!element) {
      toast.error('요소를 찾을 수 없습니다');
      return;
    }

    if (!id || id === 'new') {
      toast.error('저장된 자료만 업데이트할 수 있습니다.');
      return;
    }

    try {
      console.log('=== 저장 시작 ===');

      // 1. React 코드 업데이트 (한 번에 처리)
      const updatedCode = updateReactCodeBatch(selectedElementId, editingStyles);

      if (!updatedCode) {
        toast.error('코드 업데이트에 실패했습니다.');
        return;
      }

      console.log('React 코드 업데이트 완료');

      // 2. 서버에 저장
      const headers = await getAuthHeaders();

      if (!currentComponentId) {
        toast.error('컴포넌트 ID를 찾을 수 없습니다.');
        return;
      }

      console.log('💾 서버에 저장 중:', {
        conversionId: id,
        componentId: currentComponentId,
        codeLength: updatedCode.length
      });

      // PATCH 요청으로 modified_code 전달 (AI 편집과 동일한 방식)
      const params = new URLSearchParams({
        modified_code: updatedCode
      });

      const response = await fetch(
        `${API_BASE_URL}/conversions/${id}/components/${currentComponentId}/code?${params}`,
        {
          method: 'PATCH',
          headers,
          mode: 'cors',
        }
      );

      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ 서버 저장 완료:', result);

      // 3. iframe이 자동으로 재렌더링됨 (useEffect의 reactCode 의존성)
      toast.success('변경사항이 저장되었습니다');
      console.log('=== 저장 완료 ===');

      // 4. 편집 상태 초기화 (선택 유지)
      setEditingStyles(null);

    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || '저장 중 오류가 발생했습니다');
    }
  };

  // React 코드 및 JSON 데이터 일괄 업데이트
  const updateReactCodeBatch = (elementId: string, styles: typeof editingStyles) => {
    if (!elementId || !styles) return;

    const elementIndex = parseInt(elementId.replace('element-', ''));
    if (isNaN(elementIndex)) return;

    console.log('=== 코드 업데이트 시작 ===');
    console.log('Element Index:', elementIndex);
    console.log('Styles to update:', styles);

    const lines = reactCode.split('\n');
    let divCount = 0;
    let updated = false;
    let dataBindingKey: string | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // <div> 또는 <img> 태그 찾기
      const isDiv = line.includes('<div') && !line.trim().startsWith('//') && !line.trim().startsWith('/*');
      const isImg = line.includes('<img') && !line.trim().startsWith('//') && !line.trim().startsWith('/*');

      if (isDiv || isImg) {
        if (divCount === elementIndex) {
          console.log('Found target element at line', i, ':', line);

          // 이미지 태그인 경우 src 속성 업데이트
          if (isImg && styles.imageSrc) {
            console.log('Updating image src:', styles.imageSrc);

            // src 속성 업데이트
            if (line.includes('src=')) {
              // 기존 src 교체
              lines[i] = line.replace(/src=['"]([^'"]*)['"]/g, `src="${styles.imageSrc}"`);
            } else {
              // src 속성 추가
              lines[i] = line.replace(/<img/, `<img src="${styles.imageSrc}"`);
            }
            updated = true;
          }

          // 기존 style 속성 찾기
          const styleMatch = line.match(/style=\{\{([^}]*)\}\}/);

          if (styleMatch) {
            // 기존 style이 있으면 업데이트
            let styleContent = styleMatch[1].trim();
            console.log('Original style content:', styleContent);

            // style 객체를 파싱
            const styleObj: any = {};

            // 기존 스타일 파싱 (left: '10px', top: '20px' 형식)
            const stylePairs = styleContent.split(',').map(s => s.trim());
            stylePairs.forEach(pair => {
              const match = pair.match(/(\w+):\s*['"]([^'"]+)['"]/);
              if (match) {
                styleObj[match[1]] = match[2];
              }
            });

            // 새로운 값으로 업데이트 (모든 스타일 속성)
            styleObj.left = styles.left;
            styleObj.top = styles.top;
            styleObj.width = styles.width;
            styleObj.height = styles.height;
            styleObj.backgroundColor = styles.backgroundColor;
            styleObj.color = styles.color;
            styleObj.fontSize = styles.fontSize;
            styleObj.fontWeight = styles.fontWeight;
            styleObj.textAlign = styles.textAlign;
            styleObj.display = styles.display;
            styleObj.alignItems = styles.alignItems;
            styleObj.justifyContent = styles.justifyContent;

            // 다시 문자열로 변환
            const newStyleContent = Object.entries(styleObj)
              .map(([k, v]) => `${k}: '${v}'`)
              .join(', ');

            lines[i] = line.replace(/style=\{\{[^}]*\}\}/, `style={{ ${newStyleContent} }}`);
            console.log('Updated line:', lines[i]);
            updated = true;
          } else {
            // style 속성이 없으면 추가 (모든 스타일 속성 포함)
            const styleStr = `left: '${styles.left}', top: '${styles.top}', width: '${styles.width}', height: '${styles.height}', backgroundColor: '${styles.backgroundColor}', color: '${styles.color}', fontSize: '${styles.fontSize}', fontWeight: '${styles.fontWeight}', textAlign: '${styles.textAlign}', display: '${styles.display}', alignItems: '${styles.alignItems}', justifyContent: '${styles.justifyContent}'`;

            if (line.includes('className=')) {
              lines[i] = line.replace(/className=/, `style={{ ${styleStr} }} className=`);
            } else {
              // > 앞에 추가
              lines[i] = line.replace(/>/, ` style={{ ${styleStr} }}>`);
            }
            console.log('Added style to line:', lines[i]);
            updated = true;
          }

          // 텍스트 내용 확인 - {data.xxx} 패턴인지 체크
          const trimmedText = styles.textContent?.trim();
          if (trimmedText && trimmedText.length > 0) {
            console.log('Checking text content:', trimmedText);

            // 같은 줄에 </div>가 있는지 확인
            if (lines[i].includes('</div>')) {
              const textMatch = lines[i].match(/>(.*?)<\/div>/);
              if (textMatch) {
                const currentText = textMatch[1].trim();
                console.log('Current text in same line:', currentText);

                // {data.xxx} 패턴 찾기
                const dataMatch = currentText.match(/\{data\.(\w+)\}/);
                if (dataMatch) {
                  dataBindingKey = dataMatch[1];
                  console.log('Found data binding key:', dataBindingKey);
                } else {
                  // 데이터 바인딩이 아니면 직접 텍스트 교체
                  lines[i] = lines[i].replace(/>[^<]*<\/div>/, `>${trimmedText}</div>`);
                  console.log('Updated text directly:', lines[i]);
                }
              }
            } else {
              // 여러 줄 패턴
              for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
                if (lines[j].includes('</div>')) {
                  for (let k = i + 1; k < j; k++) {
                    const textLine = lines[k].trim();
                    if (textLine && !textLine.startsWith('<') && !textLine.startsWith('//')) {
                      console.log('Found text line:', textLine);

                      // {data.xxx} 패턴 찾기
                      const dataMatch = textLine.match(/\{data\.(\w+)\}/);
                      if (dataMatch) {
                        dataBindingKey = dataMatch[1];
                        console.log('Found data binding key in multiline:', dataBindingKey);
                      } else {
                        // 데이터 바인딩이 아니면 직접 텍스트 교체
                        const indent = lines[k].match(/^\s*/)?.[0] || '      ';
                        lines[k] = indent + trimmedText;
                        console.log('Updated text directly in multiline:', lines[k]);
                      }
                      break;
                    }
                  }
                  break;
                }
              }
            }
          }

          break;
        }
        divCount++;
      }
    }

    // React 코드 업데이트
    const updatedCode = lines.join('\n');
    console.log('=== 업데이트된 코드 미리보기 (첫 20줄) ===');
    console.log(updatedCode.split('\n').slice(0, 20).join('\n'));

    if (updated) {
      setReactCode(updatedCode);
    }

    // JSON 데이터 업데이트 (데이터 바인딩이 있는 경우)
    if (dataBindingKey && styles.textContent) {
      console.log('Updating JSON data:', dataBindingKey, '=', styles.textContent);

      try {
        const currentData = JSON.parse(jsonData);
        currentData[dataBindingKey] = styles.textContent;
        const updatedJson = JSON.stringify(currentData, null, 2);
        setJsonData(updatedJson);
        console.log('JSON data updated');
      } catch (error) {
        console.error('Failed to update JSON data:', error);
      }
    }

    console.log('=== 코드 업데이트 완료 ===');

    // 업데이트된 코드 반환
    return updated ? updatedCode : null;
  };

  // React 코드에서 해당 요소의 속성을 업데이트
  const updateReactCode = (elementId: string | null, property: string, value: string) => {
    if (!elementId) return;

    // element-0, element-1... 형태에서 인덱스 추출
    const elementIndex = parseInt(elementId.replace('element-', ''));
    if (isNaN(elementIndex)) return;

    // React 코드를 줄 단위로 분리
    const lines = reactCode.split('\n');

    // div 태그를 찾아서 카운트
    let divCount = 0;
    let targetLineIndex = -1;
    let inTargetDiv = false;
    let bracketDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // <div로 시작하는 라인 찾기
      if (line.includes('<div') && !line.trim().startsWith('//') && !line.trim().startsWith('/*')) {
        if (divCount === elementIndex) {
          targetLineIndex = i;
          inTargetDiv = true;

          // 해당 div와 다음 몇 줄을 확인하여 업데이트
          if (property === 'textContent') {
            // 텍스트 내용 업데이트
            let foundClosingTag = false;

            for (let j = i; j < Math.min(i + 15, lines.length); j++) {
              const currentLine = lines[j];

              // 같은 줄에 여는 태그와 닫는 태그가 있는 경우: <div...>텍스트</div>
              if (j === i && currentLine.includes('</div>')) {
                const match = currentLine.match(/>([^<]*)<\/div>/);
                if (match) {
                  // {data.xxx} 패턴인지 확인
                  const contentMatch = match[1].match(/\{data\.\w+\}/);
                  if (contentMatch) {
                    lines[j] = currentLine.replace(/>\{data\.\w+\}<\/div>/, `>{data.${value.replace(/[{}]/g, '')}}</div>`);
                  } else {
                    lines[j] = currentLine.replace(/>([^<]*)<\/div>/, `>${value}</div>`);
                  }
                  foundClosingTag = true;
                  break;
                }
              }

              // 닫는 태그를 찾음
              if (j > i && currentLine.includes('</div>')) {
                // 바로 이전 줄이 텍스트인지 확인
                for (let k = j - 1; k > i; k--) {
                  const textLine = lines[k].trim();

                  // 빈 줄이나 다른 태그는 건너뛰기
                  if (!textLine || textLine.startsWith('<') || textLine.startsWith('//') || textLine.startsWith('/*')) {
                    continue;
                  }

                  // 텍스트 라인 찾음
                  const indent = lines[k].match(/^\s*/)?.[0] || '';

                  // {data.xxx} 패턴인지 확인
                  if (textLine.includes('{data.')) {
                    lines[k] = indent + `{data.${value.replace(/[{}data.]/g, '')}}`;
                  } else {
                    lines[k] = indent + value;
                  }

                  foundClosingTag = true;
                  break;
                }

                if (foundClosingTag) break;
              }
            }
          } else {
            // 스타일 속성 업데이트
            const styleMatch = line.match(/style=\{\{([^}]+)\}\}/);

            if (styleMatch) {
              // 기존 style 객체가 있는 경우
              let styleContent = styleMatch[1];

              // 속성 이름을 CSS에서 camelCase로 변환
              const cssProperty = property === 'backgroundColor' ? 'backgroundColor' :
                                  property === 'fontSize' ? 'fontSize' :
                                  property === 'textAlign' ? 'textAlign' : property;

              // 해당 속성이 이미 있는지 확인
              const propertyRegex = new RegExp(`${cssProperty}:\\s*['"][^'"]*['"]`);

              if (styleContent.match(propertyRegex)) {
                // 기존 속성 업데이트
                styleContent = styleContent.replace(propertyRegex, `${cssProperty}: '${value}'`);
              } else {
                // 새 속성 추가
                styleContent += `, ${cssProperty}: '${value}'`;
              }

              lines[i] = line.replace(/style=\{\{[^}]+\}\}/, `style={{${styleContent}}}`);
            } else {
              // style 속성이 없는 경우 - className 뒤나 태그 끝에 추가
              if (property === 'left' || property === 'top' || property === 'width' || property === 'height') {
                // 인라인 style 추가
                const cssProperty = property === 'backgroundColor' ? 'backgroundColor' :
                                    property === 'fontSize' ? 'fontSize' :
                                    property === 'textAlign' ? 'textAlign' : property;

                // className이 있는지 확인
                if (line.includes('className=')) {
                  lines[i] = line.replace('className="', `style={{ ${cssProperty}: '${value}' }} className="`);
                } else if (line.includes('>')) {
                  lines[i] = line.replace('>', ` style={{ ${cssProperty}: '${value}' }}>`);
                }
              }
            }
          }
          break;
        }
        divCount++;
      }
    }

    // 업데이트된 코드 적용
    const updatedCode = lines.join('\n');
    setReactCode(updatedCode);
  };

  // 요소 삭제 및 React 코드 동기화
  const deleteElement = () => {
    const element = getSelectedElement();
    if (!element || !selectedElementId) return;

    if (confirm('이 요소를 삭제하시겠습니까?')) {
      // 1. iframe에서 요소 제거
      element.remove();

      // 2. React 코드에서 해당 요소 제거
      deleteFromReactCode(selectedElementId);

      setSelectedElementId(null);
      toast.success('요소가 삭제되었습니다');
    }
  };

  // React 코드에서 요소 삭제
  const deleteFromReactCode = (elementId: string) => {
    const elementIndex = parseInt(elementId.replace('element-', ''));
    if (isNaN(elementIndex)) return;

    const lines = reactCode.split('\n');
    let divCount = 0;
    let startLine = -1;
    let endLine = -1;
    let depth = 0;

    // 해당 div의 시작과 끝 라인 찾기
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.includes('<div') && !line.trim().startsWith('//') && !line.trim().startsWith('/*')) {
        if (divCount === elementIndex) {
          startLine = i;

          // 주석도 함께 삭제 (바로 위 줄이 주석이면)
          if (i > 0 && lines[i - 1].trim().startsWith('{/*')) {
            startLine = i - 1;
          }

          // 같은 줄에 </div>가 있는지 확인 (자기 닫는 태그)
          if (line.includes('</div>') || line.includes('/>')) {
            endLine = i;
            break;
          }

          // 여러 줄에 걸친 div 찾기
          depth = 1;
          for (let j = i + 1; j < lines.length; j++) {
            if (lines[j].includes('<div')) depth++;
            if (lines[j].includes('</div>')) {
              depth--;
              if (depth === 0) {
                endLine = j;
                break;
              }
            }
          }
          break;
        }
        divCount++;
      }
    }

    if (startLine !== -1 && endLine !== -1) {
      // 해당 라인들 삭제
      lines.splice(startLine, endLine - startLine + 1);

      // 업데이트된 코드 적용
      const updatedCode = lines.join('\n');
      setReactCode(updatedCode);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* 상단 툴바 */}
      <div className="border-b border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between mb-2">
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

            {/* 되돌리기/다시실행 버튼 */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                title="되돌리기 (Ctrl+Z)"
                className="h-8 px-2"
              >
                <Undo className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                title="다시실행 (Ctrl+Shift+Z)"
                className="h-8 px-2"
              >
                <Redo className="w-4 h-4" />
              </Button>
            </div>

            {/* 히스토리 상태 표시 */}
            {history.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {historyIndex + 1} / {history.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsPreviewOpen(true)}
            >
              <Eye className="w-4 h-4 mr-2" />
              미리보기
            </Button>
            <Button
              size="sm"
              className="bg-mango-green hover:bg-mango-green/90 text-white"
              onClick={handleSaveToServer}
              disabled={!hasUnsavedChanges}
            >
              <Save className="w-4 h-4 mr-2" />
              {hasUnsavedChanges ? '저장' : '저장됨'}
            </Button>
          </div>
        </div>

        {/* 자료 정보 편집 */}
        <div className="flex items-center gap-4">
          {!isEditingInfo ? (
            <>
              <div className="flex-1">
                <p className="text-sm font-medium">{contentName || '제목 없음'}</p>
                <p className="text-xs text-muted-foreground">{description || '설명 없음'}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditingInfo(true)}
              >
                편집
              </Button>
            </>
          ) : (
            <>
              <div className="flex-1 flex gap-2">
                <Input
                  value={contentName}
                  onChange={(e) => setContentName(e.target.value)}
                  placeholder="자료명"
                  className="h-8"
                />
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="설명"
                  className="h-8"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditingInfo(false);
                    // 원래 값으로 되돌리기
                    setContentName(conversionData?.content_name || '');
                    setDescription(conversionData?.description || '');
                  }}
                >
                  취소
                </Button>
                <Button
                  size="sm"
                  className="bg-mango-green hover:bg-mango-green/90 text-white"
                  onClick={handleUpdateConversionInfo}
                >
                  저장
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 메인 영역 */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* 왼쪽 - 코드 & 데이터 */}
        <div
          className={`border-r border-border bg-card flex flex-col transition-all duration-300 ${
            isLeftPanelOpen ? 'w-96' : 'w-0'
          }`}
          style={{
            overflow: isLeftPanelOpen ? 'visible' : 'hidden',
            opacity: isLeftPanelOpen ? 1 : 0
          }}
        >
          <Tabs defaultValue="slides" className="h-full flex flex-col">
            <div className="px-4 pt-4 pb-2 border-b border-border">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="slides">
                  <Layers className="w-4 h-4 mr-2" />
                  페이지
                </TabsTrigger>
                <TabsTrigger value="code">
                  <Code className="w-4 h-4 mr-2" />
                  코드
                </TabsTrigger>
                <TabsTrigger value="data">
                  <Database className="w-4 h-4 mr-2" />
                  데이터
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="slides" className="m-0 p-4 overflow-auto">
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-4">
                  <Label>페이지 목록</Label>
                  <Button size="sm" onClick={addPage} variant="outline">
                    <Plus className="w-4 h-4 mr-1" />
                    추가
                  </Button>
                </div>
                <div className="space-y-2">
                  {pages.map((page) => (
                    <div
                      key={page.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        currentPageId === page.id
                          ? 'bg-mango-green/10 border-mango-green'
                          : 'bg-card border-border hover:bg-muted'
                      }`}
                      onClick={() => setCurrentPageId(page.id)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{page.name}</span>
                        {pages.length > 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePage(page.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>코드: {page.reactCode ? `${page.reactCode.length}자` : '없음'}</span>
                        <span>•</span>
                        <span>데이터: {page.jsonData ? `${page.jsonData.length}자` : '없음'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="code" className="flex-1 flex flex-col m-0 p-4">
              <div className="flex-1 flex flex-col space-y-3">
                <Label>React 코드</Label>
                <Textarea
                  value={reactCode}
                  onChange={(e) => setReactCode(e.target.value)}
                  placeholder="React 컴포넌트 코드를 붙여넣으세요..."
                  className="flex-1 font-mono text-sm resize-none bg-slate-950 text-slate-50 border-slate-800 min-h-[500px]"
                  style={{
                    lineHeight: '1.6',
                    tabSize: 2,
                    whiteSpace: 'pre'
                  }}
                />
                <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
                  <p className="font-semibold mb-2">💡 사용 방법:</p>
                  <ul className="space-y-1.5 ml-1">
                    <li>• React 컴포넌트를 붙여넣으세요</li>
                    <li>• 렌더링된 화면에서 요소를 클릭하여 편집</li>
                    <li>• 오른쪽 패널에서 속성을 수정하세요</li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="data" className="flex-1 flex flex-col m-0 p-4">
              <div className="flex-1 flex flex-col">
                <Label className="mb-2">JSON 데이터</Label>
                <Textarea
                  value={jsonData}
                  onChange={(e) => setJsonData(e.target.value)}
                  className="flex-1 font-mono text-xs resize-none min-h-[500px]"
                  placeholder='{"key": "value"}'
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* 토글 버튼 */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
          className="absolute left-0 top-4 z-10 rounded-r-md rounded-l-none border-l-0 h-20 px-2"
          style={{
            left: isLeftPanelOpen ? '384px' : '0px',
            transition: 'left 0.3s ease'
          }}
        >
          {isLeftPanelOpen ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </Button>

        {/* 중앙 - 렌더링된 웹사이트 */}
        <div className="flex-1 bg-muted/20 overflow-auto flex items-center justify-center p-8">
          <div
            className="bg-white rounded-lg shadow-2xl overflow-hidden"
            style={{
              width: '1280px',
              height: '720px',
              minWidth: '1280px',
              minHeight: '720px',
              maxWidth: '1280px',
              maxHeight: '720px'
            }}
          >
            {!reactCode.trim() ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <Code className="w-20 h-20 mb-4 opacity-20" />
                <p className="text-lg font-semibold">왼쪽에 React 코드를 붙여넣으세요</p>
                <p className="text-sm mt-2">실제 웹사이트가 렌더링됩니다 (1280×720, 16:9)</p>
              </div>
            ) : (
              <iframe
                ref={iframeRef}
                className="w-full h-full border-0"
                title="rendered-content"
                sandbox="allow-scripts allow-same-origin"
              />
            )}
          </div>
        </div>

        {/* 오른쪽 - 속성 편집 패널 */}
        <div className="border-l border-border bg-card flex flex-col relative" style={{ width: '277px' }}>
          <Tabs defaultValue="properties" className="flex flex-col h-full">
            <div className="p-4 border-b border-border">
              <h3 className="text-base font-semibold flex items-center gap-2 mb-3">
                <Move className="w-5 h-5" />
                편집 패널
              </h3>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="properties" className="text-xs">
                  <Move className="w-3 h-3 mr-1" />
                  속성
                </TabsTrigger>
                <TabsTrigger value="ai" className="text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI 편집
                </TabsTrigger>
              </TabsList>
            </div>

            {/* 속성 편집 탭 */}
            <TabsContent value="properties" className="m-0 overflow-hidden">
              <ScrollArea className="h-full" style={{ paddingBottom: '140px' }}>
                <div className="p-4 space-y-6">
                  {!selectedElementId ? (
                    <div className="text-center text-muted-foreground py-16">
                      <Move className="w-16 h-16 mx-auto mb-4 opacity-20" />
                      <p className="text-sm font-medium">요소를 선택하세요</p>
                      <p className="text-xs mt-1">화면에서 요소를 클릭하면 편집할 수 있습니다</p>
                    </div>
                  ) : (
                <>
                  {!editingStyles ? (
                    <div className="text-center text-muted-foreground py-12">
                      <p className="text-sm">속성을 불러오는 중...</p>
                    </div>
                  ) : (
                    <>
                      {/* 이미지 편집 */}
                      {editingStyles.imageSrc && (
                        <>
                          <div className="space-y-3">
                            <Label className="flex items-center gap-2">
                              <ImageIcon className="w-4 h-4" />
                              이미지
                            </Label>

                            {/* 현재 이미지 미리보기 */}
                            <div className="border rounded-lg p-2 bg-muted/20">
                              <img
                                src={editingStyles.imageSrc}
                                alt="미리보기"
                                className="w-full h-32 object-contain rounded"
                              />
                            </div>

                            {/* 이미지 URL 직접 입력 */}
                            <div>
                              <Label className="text-xs text-muted-foreground mb-1">이미지 URL</Label>
                              <Input
                                value={editingStyles.imageSrc}
                                onChange={(e) => updateEditingStyle('imageSrc', e.target.value)}
                                placeholder="https://example.com/image.jpg"
                                className="font-mono text-xs"
                              />
                            </div>

                            {/* 이미지 선택 버튼 */}
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={loadImageGallery}
                                disabled={loadingImages}
                              >
                                <ImageIcon className="w-4 h-4 mr-2" />
                                갤러리
                              </Button>

                              <input
                                ref={imageInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => imageInputRef.current?.click()}
                              >
                                <Upload className="w-4 h-4 mr-2" />
                                업로드
                              </Button>
                            </div>
                          </div>

                          <Separator />
                        </>
                      )}

                      {/* 텍스트 편집 */}
                      {!editingStyles.imageSrc && (
                        <div className="space-y-3">
                          <Label className="flex items-center gap-2">
                            <Type className="w-4 h-4" />
                            텍스트 내용
                          </Label>
                          <Textarea
                            value={editingStyles.textContent || ''}
                            onChange={(e) => updateEditingStyle('textContent', e.target.value)}
                            rows={3}
                            placeholder="텍스트를 입력하세요"
                          />
                        </div>
                      )}

                      <Separator />

                      {/* 위치 */}
                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          <Move className="w-4 h-4" />
                          위치 (px)
                        </Label>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">Left (X)</Label>
                            <Input
                              type="number"
                              value={parseInt(editingStyles.left) || 0}
                              onChange={(e) => updateEditingStyle('left', `${e.target.value}px`)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Top (Y)</Label>
                            <Input
                              type="number"
                              value={parseInt(editingStyles.top) || 0}
                              onChange={(e) => updateEditingStyle('top', `${e.target.value}px`)}
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* 크기 */}
                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          <Maximize2 className="w-4 h-4" />
                          크기 (px)
                        </Label>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">Width</Label>
                            <Input
                              type="number"
                              value={parseInt(editingStyles.width) || 0}
                              onChange={(e) => updateEditingStyle('width', `${e.target.value}px`)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Height</Label>
                            <Input
                              type="number"
                              value={parseInt(editingStyles.height) || 0}
                              onChange={(e) => updateEditingStyle('height', `${e.target.value}px`)}
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* 색상 */}
                      <div className="space-y-3">
                        <Label>색상</Label>
                        <div className="space-y-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">배경색</Label>
                            <div className="flex gap-2">
                              <Input
                                type="color"
                                value={rgbToHex(editingStyles.backgroundColor)}
                                onChange={(e) => updateEditingStyle('backgroundColor', e.target.value)}
                                className="w-20"
                              />
                              <Input
                                value={editingStyles.backgroundColor}
                                onChange={(e) => updateEditingStyle('backgroundColor', e.target.value)}
                                className="flex-1 font-mono text-xs"
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">글자색</Label>
                            <div className="flex gap-2">
                              <Input
                                type="color"
                                value={rgbToHex(editingStyles.color)}
                                onChange={(e) => updateEditingStyle('color', e.target.value)}
                                className="w-20"
                              />
                              <Input
                                value={editingStyles.color}
                                onChange={(e) => updateEditingStyle('color', e.target.value)}
                                className="flex-1 font-mono text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* 텍스트 스타일 */}
                      <div className="space-y-3">
                        <Label>텍스트 스타일</Label>
                        <div className="space-y-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">글자 크기</Label>
                            <Input
                              value={editingStyles.fontSize}
                              onChange={(e) => updateEditingStyle('fontSize', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">글자 굵기</Label>
                            <select
                              value={editingStyles.fontWeight}
                              onChange={(e) => updateEditingStyle('fontWeight', e.target.value)}
                              className="w-full h-9 px-3 rounded-md border border-input bg-background"
                            >
                              <option value="normal">보통</option>
                              <option value="bold">굵게</option>
                              <option value="lighter">얇게</option>
                              <option value="100">100</option>
                              <option value="200">200</option>
                              <option value="300">300</option>
                              <option value="400">400 (보통)</option>
                              <option value="500">500</option>
                              <option value="600">600</option>
                              <option value="700">700 (굵게)</option>
                              <option value="800">800</option>
                              <option value="900">900</option>
                            </select>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">가로 정렬</Label>
                            <select
                              value={editingStyles.textAlign}
                              onChange={(e) => updateEditingStyle('textAlign', e.target.value)}
                              className="w-full h-9 px-3 rounded-md border border-input bg-background"
                            >
                              <option value="left">왼쪽</option>
                              <option value="center">가운데</option>
                              <option value="right">오른쪽</option>
                            </select>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">세로 정렬</Label>
                            <select
                              value={editingStyles.alignItems}
                              onChange={(e) => {
                                if (!editingStyles) return;

                                // textAlign을 justifyContent로 변환
                                let justifyContentValue = 'flex-start';
                                if (editingStyles.textAlign === 'center') {
                                  justifyContentValue = 'center';
                                } else if (editingStyles.textAlign === 'right') {
                                  justifyContentValue = 'flex-end';
                                } else if (editingStyles.textAlign === 'left') {
                                  justifyContentValue = 'flex-start';
                                }

                                // display를 flex로 자동 설정하고 alignItems, justifyContent 동시 업데이트
                                const newStyles = {
                                  ...editingStyles,
                                  display: 'flex',
                                  alignItems: e.target.value,
                                  justifyContent: justifyContentValue
                                };
                                setEditingStyles(newStyles);

                                // 실시간으로 iframe에 반영 (모든 스타일 유지)
                                const element = getSelectedElement();
                                if (element) {
                                  element.style.display = 'flex';
                                  element.style.alignItems = e.target.value;
                                  element.style.justifyContent = justifyContentValue;
                                  // 기존 textAlign도 유지 (텍스트 노드용)
                                  if (editingStyles.textAlign) {
                                    element.style.textAlign = editingStyles.textAlign;
                                  }
                                }
                              }}
                              className="w-full h-9 px-3 rounded-md border border-input bg-background"
                            >
                              <option value="flex-start">위</option>
                              <option value="center">가운데</option>
                              <option value="flex-end">아래</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
                </div>
              </ScrollArea>
              {/* 저장/삭제 버튼 영역 */}
              {selectedElementId && editingStyles && (
                <div className="absolute bottom-0 left-0 right-0 bg-card border-t border-border p-4 space-y-3">
                  {/* 저장 버튼 */}
                  <Button
                    className="w-full bg-mango-green hover:bg-mango-green/90 text-white"
                    onClick={saveStyleChanges}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    변경사항 저장
                  </Button>

                  {/* 삭제 버튼 */}
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={deleteElement}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    요소 삭제
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* AI 편집 탭 */}
            <TabsContent value="ai" className="m-0 flex flex-col h-full">
              <div className="flex-1 flex flex-col min-h-0">
                {/* AI 편집 모드 선택 */}
                <div className="border-b border-border p-3 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">편집 모드:</Label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={aiEditMode === 'code' ? 'default' : 'outline'}
                        onClick={() => setAiEditMode('code')}
                        className="h-7 text-xs"
                      >
                        레이아웃 수정
                      </Button>
                      <Button
                        size="sm"
                        variant={aiEditMode === 'data' ? 'default' : 'outline'}
                        onClick={() => setAiEditMode('data')}
                        className="h-7 text-xs"
                      >
                        데이터 형식 편집
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {aiEditMode === 'code'
                      ? '💻 레이아웃을 수정합니다. 스타일, 구조, 인터랙션 등을 변경할 수 있습니다.'
                      : '📝 데이터 형식을 편집합니다. 텍스트, 이미지 URL 등을 변경할 수 있습니다.'}
                  </p>
                </div>

                {/* 채팅 메시지 영역 */}
                <div className="flex-1 overflow-y-auto p-4" ref={chatScrollRef}>
                  {chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-12">
                      <Sparkles className="w-16 h-16 mb-4 opacity-20" />
                      <p className="text-sm font-medium">AI와 대화하기</p>
                      <p className="text-xs mt-2 px-4">
                        인터랙션 기능을 추가하고 싶은 내용을 설명해주세요.
                      </p>
                      <div className="mt-4 text-xs space-y-1 text-left bg-muted/30 p-3 rounded-lg">
                        <p className="font-semibold mb-2">예시:</p>
                        <p>• "버튼을 클릭하면 색상 변경"</p>
                        <p>• "마우스 호버 시 확대 효과"</p>
                        <p>• "페이드인 애니메이션 추가"</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {chatMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-lg p-3 ${
                              message.role === 'user'
                                ? 'bg-mango-green text-white'
                                : 'bg-muted text-foreground'
                            }`}
                          >
                            <p className="text-xs whitespace-pre-wrap">{message.content}</p>
                            <p className={`text-[10px] mt-1 ${
                              message.role === 'user' ? 'text-white/70' : 'text-muted-foreground'
                            }`}>
                              {new Date(message.timestamp).toLocaleTimeString('ko-KR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                      {isChatLoading && (
                        <div className="flex justify-start">
                          <div className="bg-muted rounded-lg p-3">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 저장 버튼 영역 */}
                {hasUnsavedChanges && (
                  <div className="flex-shrink-0 border-t border-border px-4 py-3 bg-muted/30">
                    <Button
                      onClick={handleSaveToServer}
                      className="w-full bg-mango-green hover:bg-mango-green/90 text-white"
                      size="sm"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      AI 수정사항을 서버에 저장
                    </Button>
                  </div>
                )}

                {/* 입력 영역 */}
                <div className="flex-shrink-0 border-t border-border p-4">
                  {/* 파일 첨부 표시 */}
                  {uploadedFile && (
                    <div className="mb-2 flex items-center gap-2 p-2 bg-muted rounded-md">
                      <Paperclip className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm flex-1 truncate">{uploadedFile.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveFile}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <div className="flex flex-col gap-2 flex-1">
                      <Textarea
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendChatMessage();
                          }
                        }}
                        placeholder="인터랙션 기능을 설명해주세요..."
                        className="flex-1 resize-none text-sm h-[80px] max-h-[80px] overflow-y-auto"
                        disabled={isChatLoading}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/*,video/*,.pdf,.doc,.docx,.txt,.webm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isChatLoading}
                        className="h-[38px] w-12"
                        title="파일 첨부"
                      >
                        <Paperclip className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        onClick={handleSendChatMessage}
                        disabled={!chatInput.trim() || isChatLoading}
                        className="bg-mango-green hover:bg-mango-green/90 h-[38px] w-12"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Enter로 전송, Shift+Enter로 줄바꿈 | 파일 첨부 가능
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* 이미지 갤러리 모달 */}
      <Dialog open={isImageGalleryOpen} onOpenChange={setIsImageGalleryOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>이미지 선택</DialogTitle>
            <DialogDescription>
              사용할 이미지를 선택하세요
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[60vh] pr-4">
            {loadingImages ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mango-green"></div>
              </div>
            ) : availableImages.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>사용 가능한 이미지가 없습니다.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {availableImages.map((imageUrl, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-2 cursor-pointer hover:border-mango-green hover:shadow-lg transition-all"
                    onClick={() => handleImageSelect(imageUrl)}
                  >
                    <img
                      src={imageUrl}
                      alt={`이미지 ${index + 1}`}
                      className="w-full h-40 object-cover rounded"
                    />
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* 미리보기 모달 */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] w-full h-full p-0 [&>button]:hidden">
          <div className="flex flex-col h-full">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-4 border-b bg-background">
              <div>
                <DialogTitle className="text-lg font-semibold">미리보기</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  현재 페이지의 실시간 미리보기
                </DialogDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsPreviewOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* 미리보기 영역 */}
            <div className="flex-1 overflow-auto bg-gray-100 p-8">
              <div className="mx-auto bg-white shadow-2xl" style={{ width: '1280px', height: '720px' }}>
                <iframe
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                  }}
                  title="Preview"
                  srcDoc={`
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
                          const { useState, useEffect } = React;

                          ${(() => {
                            // import 문 제거
                            let cleanCode = reactCode.replace(/import\s+.*?from\s+['"].*?['"];?\s*/g, '');
                            // export default 제거
                            cleanCode = cleanCode.replace(/export\s+default\s+/g, '');
                            // 컴포넌트 이름 추출 (변경하지 않고 그대로 사용)
                            const componentNameMatch = cleanCode.match(/function\s+(\w+)/);
                            const componentName = componentNameMatch ? componentNameMatch[1] : 'Component';
                            return { cleanCode, componentName };
                          })().cleanCode}

                          const jsonData = ${jsonData};
                          const componentName = ${(() => {
                            const componentNameMatch = reactCode.match(/function\s+(\w+)/);
                            return componentNameMatch ? `'${componentNameMatch[1]}'` : "'Component'";
                          })()};

                          // 컴포넌트가 정의되어 있다면 렌더링
                          const ComponentToRender = eval(componentName);
                          if (typeof ComponentToRender !== 'undefined') {
                            const root = ReactDOM.createRoot(document.getElementById('root'));
                            root.render(React.createElement(ComponentToRender, { data: jsonData }));
                          } else {
                            document.getElementById('root').innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; font-size: 24px; color: #666;">컴포넌트를 불러올 수 없습니다.</div>';
                          }
                        </script>
                      </body>
                    </html>
                  `}
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// RGB를 HEX로 변환하는 유틸리티 함수
function rgbToHex(rgb: string): string {
  if (rgb.startsWith('#')) return rgb;

  const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (!match) return '#000000';

  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);

  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}
