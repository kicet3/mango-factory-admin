import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Eye, Edit, Search, Plus, Upload, FileText, Presentation, Code, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ConversionItem {
  id: number;
  original_filename: string;
  content_name?: string;
  description?: string;
  file_type: string;
  source_type: string;
  conversion_type: string;
  framework: string;
  styling: string;
  success: boolean;
  total_components: number;
  total_slides: number;
  generation_time: number;
  created_at: string;
}

interface ConversionsResponse {
  success: boolean;
  total: number;
  page: number;
  page_size: number;
  conversions: ConversionItem[];
}

interface ComponentDetail {
  id: number;
  conversion_id: number;
  component_name: string;
  code: string;
  imports: string[];
  props_schema: any;
  created_at: string;
}

interface SlideDetail {
  id: number;
  conversion_id: number;
  slide_number: number;
  layout_component: string;
  data: any;
  created_at: string;
}

interface ConversionDetail {
  id: number;
  user_id: number;
  session_id: number;
  original_filename: string;
  file_type: string;
  file_size: number;
  source_type: string;
  conversion_type: string;
  framework: string;
  styling: string;
  conversion_mode: string;
  success: boolean;
  message: string;
  generation_time: number;
  total_components: number;
  total_slides: number;
  conversion_metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  components: ComponentDetail[];
  slides: SlideDetail[];
}

export default function MaterialManagementV2() {
  const navigate = useNavigate();
  const [conversions, setConversions] = useState<ConversionItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

  // 파일 업로드 모달 상태
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [newMaterialName, setNewMaterialName] = useState('');
  const [newMaterialDescription, setNewMaterialDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // FormData 업로드용 헤더 (Content-Type 제외)
  const getAuthHeadersForFormData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: HeadersInit = {};

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    return headers;
  };

  useEffect(() => {
    loadConversions();
  }, [page]);

  const loadConversions = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });

      const headers = await getAuthHeaders();

      const response = await fetch(`${API_BASE_URL}/conversions/?${params}`, {
        method: 'GET',
        headers,
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status} ${response.statusText}`);
      }

      const data: ConversionsResponse = await response.json();

      if (data.success) {
        setConversions(data.conversions);
        setTotal(data.total);
      } else {
        throw new Error('데이터를 불러오는데 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Error loading conversions:', error);
      toast.error(error.message || '자료를 불러오는 중 오류가 발생했습니다.');
      // 에러 발생 시 빈 배열 설정
      setConversions([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversions = conversions.filter((conversion) =>
    conversion.original_filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (conversion.content_name && conversion.content_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (conversion.description && conversion.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    conversion.file_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conversion.framework.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchConversionDetail = async (conversionId: number): Promise<ConversionDetail | null> => {
    try {
      const headers = await getAuthHeaders();

      const response = await fetch(`${API_BASE_URL}/conversions/${conversionId}`, {
        method: 'GET',
        headers,
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status} ${response.statusText}`);
      }

      const data: ConversionDetail = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error fetching conversion detail:', error);
      toast.error(error.message || '상세 정보를 불러오는 중 오류가 발생했습니다.');
      return null;
    }
  };

  const handleEdit = async (conversionId: number) => {
    const detail = await fetchConversionDetail(conversionId);
    if (detail) {
      // 상세 데이터를 세션 스토리지에 저장
      sessionStorage.setItem('conversionDetail', JSON.stringify(detail));
      navigate(`/admin/materials-v2/editor/${conversionId}`);
    }
  };

  const handlePreview = async (conversionId: number) => {
    const detail = await fetchConversionDetail(conversionId);
    if (detail) {
      // 상세 데이터를 세션 스토리지에 저장
      sessionStorage.setItem('conversionDetail', JSON.stringify(detail));
      navigate(`/admin/materials-v2/preview/${conversionId}`);
    }
  };

  const handleDelete = async (conversionId: number, filename: string) => {
    const confirmed = window.confirm(
      `"${filename}" 자료를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 관련된 모든 데이터(컴포넌트, 슬라이드, 스타일)가 함께 삭제됩니다.`
    );

    if (!confirmed) return;

    try {
      const headers = await getAuthHeaders();

      const response = await fetch(`${API_BASE_URL}/conversions/${conversionId}?confirm=true`, {
        method: 'DELETE',
        headers,
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        toast.success('자료가 삭제되었습니다.');
        // 목록 새로고침
        await loadConversions();
      } else {
        throw new Error(data.message || '삭제에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Error deleting conversion:', error);
      toast.error(error.message || '자료 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 지원하는 파일 타입
      const allowedTypes = [
        'text/html',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-powerpoint',
        'text/javascript',
        'application/javascript',
        'text/jsx',
        'text/typescript',
        'application/typescript'
      ];

      // 확장자로도 체크 (.jsx, .tsx 등)
      const fileName = file.name.toLowerCase();
      const allowedExtensions = ['.html', '.pptx', '.ppt', '.jsx', '.js', '.tsx', '.ts'];
      const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

      if (!allowedTypes.includes(file.type) && !hasValidExtension) {
        toast.error('HTML, PPTX 또는 React 파일(.jsx, .tsx)만 업로드할 수 있습니다.');
        return;
      }

      setUploadedFile(file);

      // 파일 이름에서 확장자를 제거하여 기본 자료명으로 설정
      const nameWithoutExtension = file.name.replace(/\.(html|pptx|ppt|jsx|js|tsx|ts)$/i, '');
      if (!newMaterialName) {
        setNewMaterialName(nameWithoutExtension);
      }
    }
  };

  const handleCreateMaterial = async () => {
    if (!uploadedFile) {
      toast.error('파일을 업로드해주세요.');
      return;
    }

    if (!newMaterialName.trim()) {
      toast.error('자료 이름을 입력해주세요.');
      return;
    }

    try {
      setIsProcessing(true);
      setProgress(0);

      // 프로그레스 시뮬레이션 (30-40초 기준)
      const totalDuration = 35000; // 35초
      const interval = 100; // 100ms마다 업데이트
      const increment = (100 / totalDuration) * interval;

      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const next = prev + increment;
          // 95%까지만 자동으로 증가 (API 완료 후 100%로)
          return next >= 95 ? 95 : next;
        });
      }, interval);

      // FormData 생성
      const formData = new FormData();
      formData.append('file', uploadedFile);

      // 선택적 파라미터
      if (newMaterialName) {
        formData.append('content_name', newMaterialName);
      }
      if (newMaterialDescription) {
        formData.append('description', newMaterialDescription);
      }

      // 기본 설정
      formData.append('framework', 'react');
      formData.append('styling', 'tailwind');

      // JWT 토큰 헤더 가져오기
      const headers = await getAuthHeadersForFormData();

      // AI API 호출
      const response = await fetch(`${API_BASE_URL}/document-convert-react/convert-from-code`, {
        method: 'POST',
        headers,
        body: formData,
        mode: 'cors', // CORS 명시적 설정
      });

      // 프로그레스 정리
      clearInterval(progressInterval);

      if (!response.ok) {
        let errorMessage = '파일 변환에 실패했습니다.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (e) {
          errorMessage = `서버 오류: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error('파일 변환에 실패했습니다.');
      }

      // 완료 시 100%로
      setProgress(100);

      console.log('AI 변환 결과:', data);

      // API 응답 구조에 맞춰 데이터 파싱
      // components: [{ component_name, code, imports }]
      // slides_data: [{ slide_number, layout_component, data }]

      // 각 컴포넌트의 code를 추출하여 페이지별 React 코드로 사용
      const reactComponents = data.components?.map((comp: any) => {
        const imports = comp.imports?.join('\n') || '';
        const code = comp.code || '';
        return `${imports}\n\n${code}`;
      }) || [];

      // 슬라이드 데이터를 JSON 형태로 변환
      const slidesData = data.slides_data?.map((slide: any) => slide.data || {}) || [];

      // 변환 결과를 세션 스토리지에 저장하여 에디터로 전달
      const materialData = {
        name: newMaterialName,
        description: newMaterialDescription,
        components: reactComponents, // 페이지별 React 코드
        slidesData: slidesData, // 페이지별 JSON 데이터
        generationTime: data.generation_time,
        createdAt: new Date().toISOString(),
      };

      sessionStorage.setItem('newMaterialData', JSON.stringify(materialData));

      const slideCount = reactComponents.length;
      toast.success(`자료가 생성되었습니다! (${slideCount}개 페이지${data.generation_time ? `, ${data.generation_time.toFixed(2)}초` : ''})`);

      // 모달 닫기 및 상태 초기화
      setIsCreateModalOpen(false);
      setUploadedFile(null);
      setNewMaterialName('');
      setNewMaterialDescription('');

      // 목록 새로고침
      await loadConversions();
    } catch (error: any) {
      console.error('Error creating material:', error);
      toast.error(error.message || '자료 생성 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreate = () => {
    setIsCreateModalOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">수업자료 관리 V2</h1>
          <p className="text-muted-foreground">
            AI 생성 코드를 시각적으로 편집하고 데이터를 연결하세요
          </p>
        </div>
        <Button
          onClick={handleCreate}
          className="bg-mango-green hover:bg-mango-green/90 text-white rounded-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          새 자료 만들기
        </Button>
      </div>

      {/* 검색 */}
      <Card className="border-border shadow-card rounded-2xl">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="자료명, 설명 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* 자료 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mango-green"></div>
          </div>
        ) : filteredConversions.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            {searchTerm ? '검색 결과가 없습니다.' : '등록된 자료가 없습니다.'}
          </div>
        ) : (
          filteredConversions.map((conversion) => (
            <Card
              key={conversion.id}
              className="border-border shadow-card rounded-2xl overflow-hidden hover:shadow-lg transition-shadow h-[500px] flex flex-col"
            >
              {/* 썸네일 */}
              <div className="h-48 flex-shrink-0 bg-gradient-to-br from-mango-green-soft to-mango-green-light flex items-center justify-center relative">
                <div className="text-mango-green text-6xl font-bold opacity-20">
                  {conversion.original_filename.charAt(0).toUpperCase()}
                </div>
                {conversion.success && (
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-green-500 text-white rounded-full">
                      변환 완료
                    </Badge>
                  </div>
                )}
              </div>

              {/* 내용 */}
              <CardHeader className="flex-shrink-0">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-1">
                    {conversion.content_name || conversion.original_filename}
                  </CardTitle>
                  <Badge variant="secondary" className="rounded-full flex-shrink-0">
                    {conversion.framework}
                  </Badge>
                </div>
                {conversion.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {conversion.description}
                  </p>
                )}
              </CardHeader>

              <CardContent className="flex-1 flex flex-col justify-between space-y-4">

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(conversion.id)}
                      className="flex-1 rounded-full"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      미리보기
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleEdit(conversion.id)}
                      className="flex-1 rounded-full bg-mango-green hover:bg-mango-green/90"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      수정하기
                    </Button>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(conversion.id, conversion.original_filename)}
                    className="w-full rounded-full"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    삭제
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                  생성일: {new Date(conversion.created_at).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 파일 업로드 모달 */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>새 자료 만들기</DialogTitle>
            <DialogDescription>
              HTML 또는 PPTX 파일을 업로드하면 AI가 React 코드로 변환해드립니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* 파일 업로드 */}
            <div className="space-y-2">
              <Label htmlFor="file-upload">파일 업로드</Label>
              <input
                ref={fileInputRef}
                id="file-upload"
                type="file"
                accept=".html,.pptx,.ppt,.jsx,.js,.tsx,.ts"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-mango-green transition-colors"
              >
                {uploadedFile ? (
                  <div className="space-y-2">
                    {uploadedFile.name.match(/\.(jsx|tsx|js|ts)$/i) ? (
                      <Code className="w-12 h-12 mx-auto text-mango-green" />
                    ) : uploadedFile.type === 'text/html' ? (
                      <FileText className="w-12 h-12 mx-auto text-mango-green" />
                    ) : (
                      <Presentation className="w-12 h-12 mx-auto text-mango-green" />
                    )}
                    <p className="text-sm font-medium">{uploadedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(uploadedFile.size / 1024).toFixed(2)} KB
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadedFile(null);
                      }}
                      className="mt-2"
                    >
                      파일 변경
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                    <p className="text-sm font-medium">클릭하여 파일 업로드</p>
                    <p className="text-xs text-muted-foreground">
                      HTML, PPTX 또는 React 파일(.jsx, .tsx)을 선택해주세요
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 프로그레스 바 */}
            {isProcessing && (
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">AI 변환 진행 중...</span>
                  <span className="text-mango-green font-semibold">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  파일을 분석하고 React 컴포넌트로 변환하고 있습니다.
                </p>
              </div>
            )}

            {/* 자료 이름 */}
            <div className="space-y-2">
              <Label htmlFor="material-name">자료 이름</Label>
              <Input
                id="material-name"
                value={newMaterialName}
                onChange={(e) => setNewMaterialName(e.target.value)}
                placeholder="예: 1학기 중간고사 대비 자료"
                className="rounded-lg"
                disabled={isProcessing}
              />
            </div>

            {/* 자료 설명 */}
            <div className="space-y-2">
              <Label htmlFor="material-description">자료 설명 (선택)</Label>
              <Textarea
                id="material-description"
                value={newMaterialDescription}
                onChange={(e) => setNewMaterialDescription(e.target.value)}
                placeholder="자료에 대한 간단한 설명을 입력하세요"
                rows={3}
                className="rounded-lg resize-none"
                disabled={isProcessing}
              />
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateModalOpen(false);
                setUploadedFile(null);
                setNewMaterialName('');
                setNewMaterialDescription('');
              }}
              disabled={isProcessing}
              className="rounded-full"
            >
              취소
            </Button>
            <Button
              onClick={handleCreateMaterial}
              disabled={!uploadedFile || !newMaterialName.trim() || isProcessing}
              className="bg-mango-green hover:bg-mango-green/90 rounded-full"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  처리 중...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  생성하기
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
