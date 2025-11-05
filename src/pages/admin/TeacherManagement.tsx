import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, Eye, CheckCircle, Clock, FileText, User, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getSupabaseAuthHeaders } from "@/lib/authHeaders";
import DOMPurify from 'dompurify';
import { SUPABASE_CONFIG } from '@/config/supabase';

interface TeacherData {
  teacher_info_id: number;
  user_id: string | null;
  teacher_verified: boolean;
  teacher_verification_file_path: string | null;
  class_info: any;
  preferred_teaching_style: number[] | null;
  updated_at: string | null;
  school_id: number;
  user_email: string;
  user_name: string;
}

const statusConfig = {
  false: { label: "승인 대기", color: "bg-orange-100 text-orange-700", icon: Clock },
  true: { label: "승인", color: "bg-green-100 text-green-700", icon: CheckCircle }
};

export default function TeacherManagement() {
  const [teachers, setTeachers] = useState<TeacherData[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending"); // 기본값을 승인 대기로 변경
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTeachers();
  }, [statusFilter]); // statusFilter 변경 시에도 데이터 재조회

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      
      // Use admin edge function with proper authentication
      const { data, error } = await supabase.functions.invoke('admin-teacher-data', {
        body: { statusFilter },
        headers: await getSupabaseAuthHeaders(),
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (!data || !data.data) {
        throw new Error('Invalid response format');
      }

      const formattedData: TeacherData[] = data.data.map((item: any) => ({
        teacher_info_id: item.teacher_info_id,
        user_id: item.user_id,
        teacher_verified: item.teacher_verified || false,
        teacher_verification_file_path: item.teacher_verification_file_path,
        class_info: item.class_info,
        preferred_teaching_style: item.preferred_teaching_style,
        updated_at: item.updated_at,
        school_id: item.school_id,
        user_email: item.user_email,
        user_name: item.user_name
      }));

      setTeachers(formattedData);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      toast({
        title: "오류",
        description: "교사 정보를 가져오는데 실패했습니다.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTeachers = teachers.filter(teacher => {
    const matchesSearch = teacher.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         teacher.user_email.toLowerCase().includes(searchTerm.toLowerCase());
    // 상태 필터링은 이미 fetchTeachers에서 처리되므로 여기서는 검색어만 필터링
    return matchesSearch;
  });

  const handleViewDetail = (teacher: TeacherData) => {
    setSelectedTeacher(teacher);
    setIsDetailOpen(true);
  };

  const handleDownloadFile = async (filePath: string) => {
    try {
      // Supabase Edge Function을 직접 호출하여 파일 데이터 받기
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`${SUPABASE_CONFIG.url}/functions/v1/download-s3-file`, {
        method: 'POST',
        headers: await getSupabaseAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ fileName: filePath })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Response를 blob으로 변환
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // 파일명 추출
      const filename = filePath.split('/').pop() || 'verification-file';
      link.download = decodeURIComponent(filename);
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "다운로드 완료",
        description: "파일 다운로드가 완료되었습니다.",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "다운로드 실패",
        description: "파일 다운로드에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  const handleApprove = async (teacherId: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/teacher_info?teacher_info_id=eq.${teacherId}`, {
        method: 'PATCH',
        headers: await getSupabaseAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          teacher_verified: true,
          updated_at: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      // 승인 완료 후 현재 필터에 따라 데이터 새로고침
      await fetchTeachers();
      
      toast({
        title: "승인 완료",
        description: "교사 인증이 승인되었습니다.",
      });
      
      setIsDetailOpen(false);
    } catch (error) {
      console.error('Approval error:', error);
      toast({
        title: "승인 실패",
        description: "교사 인증 승인에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (verified: boolean) => {
    const config = statusConfig[verified.toString() as keyof typeof statusConfig];
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} rounded-full`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">교사 인증 관리</h1>
          <p className="text-muted-foreground">교사 인증 신청을 확인하고 승인을 처리하세요</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-orange-100 text-orange-700">
            {statusFilter === 'pending' ? '승인 대기' : statusFilter === 'approved' ? '승인 완료' : '전체'} {filteredTeachers.length}건
          </Badge>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <Card className="border-border shadow-card rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            필터 및 검색
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="이름, 이메일로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-full border-border"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48 rounded-full">
                <SelectValue placeholder="상태 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                <SelectItem value="pending">승인 대기</SelectItem>
                <SelectItem value="approved">승인 완료</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 교사 목록 테이블 */}
      <Card className="border-border shadow-card rounded-2xl overflow-hidden">
        <CardHeader>
          <CardTitle>교사 인증 신청 목록</CardTitle>
          <CardDescription>총 {filteredTeachers.length}명의 교사 정보</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">이름</TableHead>
                <TableHead className="font-semibold">이메일</TableHead>
                <TableHead className="font-semibold">상태</TableHead>
                <TableHead className="font-semibold">신청일</TableHead>
                <TableHead className="font-semibold text-center">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    로딩 중...
                  </TableCell>
                </TableRow>
              ) : filteredTeachers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    {statusFilter === 'pending' ? '승인 대기 중인 교사가 없습니다.' : 
                     statusFilter === 'approved' ? '승인된 교사가 없습니다.' : 
                     '교사가 없습니다.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTeachers.map((teacher) => (
                  <TableRow key={teacher.teacher_info_id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">{teacher.user_name}</TableCell>
                    <TableCell className="text-muted-foreground">{teacher.user_email}</TableCell>
                    <TableCell>{getStatusBadge(teacher.teacher_verified)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {teacher.updated_at ? new Date(teacher.updated_at).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex gap-2 justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetail(teacher)}
                          className="rounded-full"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          상세보기
                        </Button>
                        {teacher.teacher_verification_file_path && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadFile(teacher.teacher_verification_file_path!)}
                            className="rounded-full"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            파일
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 상세 정보 다이얼로그 */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              교사 상세 정보
            </DialogTitle>
            <DialogDescription>
              교사 인증 신청 내용을 확인하고 승인을 결정하세요
            </DialogDescription>
          </DialogHeader>
          
          {selectedTeacher && (
            <div className="space-y-6">
              {/* 기본 정보 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">이름</label>
                  <p className="text-foreground font-semibold">{selectedTeacher.user_name}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">이메일</label>
                  <p className="text-foreground">{selectedTeacher.user_email}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">학급 정보</label>
                  <div className="text-foreground" 
                       dangerouslySetInnerHTML={{
                         __html: DOMPurify.sanitize(
                           selectedTeacher.class_info ? 
                           JSON.stringify(selectedTeacher.class_info, null, 2).replace(/\n/g, '<br>') : 
                           "정보 없음"
                         )
                       }} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">업데이트 일시</label>
                  <p className="text-foreground">
                    {selectedTeacher.updated_at ? new Date(selectedTeacher.updated_at).toLocaleString() : '-'}
                  </p>
                </div>
              </div>

              {/* 인증 파일 */}
              {selectedTeacher.teacher_verification_file_path && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-muted-foreground">인증 파일</label>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {DOMPurify.sanitize(selectedTeacher.teacher_verification_file_path.split('/').pop() || '')}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadFile(selectedTeacher.teacher_verification_file_path!)}
                      className="rounded-full"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      다운로드
                    </Button>
                  </div>
                </div>
              )}

              {/* 현재 상태 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">현재 상태</label>
                <div>{getStatusBadge(selectedTeacher.teacher_verified)}</div>
              </div>

              {/* 승인 버튼 */}
              {!selectedTeacher.teacher_verified && (
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => handleApprove(selectedTeacher.teacher_info_id)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-full"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    승인
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}