import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Eye, FileText, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getSupabaseAuthHeaders } from "@/lib/authHeaders";
import { SUPABASE_CONFIG } from '@/config/supabase';

interface HelpRequestType {
  help_request_type_id: number;
  help_request_type_name: string;
  help_request_type_desc: string;
}

interface HelpRequest {
  help_request_id: number;
  help_request_type_id: number;
  help_request_name: string;
  help_request_email: string;
  help_request_content: string;
  help_request_file_path: string | null;
  updated_at: string;
  is_checked: boolean;
  help_request_types?: HelpRequestType;
}

export default function UserManagement() {
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchHelpRequests();
  }, []);

  const fetchHelpRequests = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('admin-help-requests', {
        headers: await getSupabaseAuthHeaders(),
      });

      if (error) throw error;
      setHelpRequests(data.data || []);
    } catch (error) {
      console.error('Error fetching help requests:', error);
      toast({
        variant: "destructive",
        title: "오류",
        description: "문의 요청을 불러오는데 실패했습니다.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleChecked = async (helpRequestId: number, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('help_requests')
        .update({ 
          is_checked: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('help_request_id', helpRequestId);

      if (error) throw error;

      setHelpRequests(prev => 
        prev.map(request => 
          request.help_request_id === helpRequestId 
            ? { ...request, is_checked: !currentStatus }
            : request
        )
      );

      toast({
        title: "성공",
        description: `문의가 ${!currentStatus ? '확인됨' : '미확인'}으로 변경되었습니다.`,
      });
    } catch (error) {
      console.error('Error updating help request:', error);
      toast({
        variant: "destructive",
        title: "오류",
        description: "상태 변경에 실패했습니다.",
      });
    }
  };

  const handleDownloadFile = async (filePath: string) => {
    try {
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

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const filename = filePath.split('/').pop() || 'help-request-file';
      link.download = decodeURIComponent(filename);
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        variant: "destructive",
        title: "오류",
        description: "파일 다운로드에 실패했습니다.",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            문의 요청 관리
          </CardTitle>
          <CardDescription>
            사용자들의 문의 요청을 확인하고 관리할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>상태</TableHead>
                  <TableHead>종류</TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>내용</TableHead>
                  <TableHead>첨부파일</TableHead>
                  <TableHead>등록일</TableHead>
                  <TableHead>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {helpRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      문의 요청이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  helpRequests.map((request) => (
                    <TableRow key={request.help_request_id}>
                      <TableCell>
                        <Badge 
                          variant={request.is_checked ? "default" : "secondary"}
                          className="flex items-center gap-1 w-fit"
                        >
                          {request.is_checked ? (
                            <>
                              <CheckCircle className="h-3 w-3" />
                              확인됨
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3" />
                              미확인
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {request.help_request_types?.help_request_type_name || '기타'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {request.help_request_name}
                      </TableCell>
                      <TableCell>{request.help_request_email}</TableCell>
                      <TableCell className="max-w-xs">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-auto p-0 text-left">
                              <div className="truncate">
                                {request.help_request_content}
                              </div>
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>문의 내용</DialogTitle>
                              <DialogDescription>
                                {request.help_request_name}님의 문의
                              </DialogDescription>
                            </DialogHeader>
                            <div className="whitespace-pre-wrap">
                              {request.help_request_content}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                      <TableCell>
                        {request.help_request_file_path ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadFile(request.help_request_file_path!)}
                            className="flex items-center gap-1"
                          >
                            <Download className="h-3 w-3" />
                            다운로드
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">없음</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {formatDate(request.updated_at)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant={request.is_checked ? "outline" : "default"}
                          size="sm"
                          onClick={() => handleToggleChecked(request.help_request_id, request.is_checked)}
                        >
                          {request.is_checked ? '미확인으로 변경' : '확인으로 변경'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}