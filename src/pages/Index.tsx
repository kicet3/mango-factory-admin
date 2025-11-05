import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-admin-access', {
        body: { accessCode: code }
      });

      if (error) {
        console.error('Error verifying access code:', error);
        toast({
          title: "접속 실패",
          description: "서버 오류가 발생했습니다.",
          variant: "destructive",
        });
        return;
      }

      if (data?.valid) {
        toast({
          title: "접속 성공",
          description: "관리자 페이지로 이동합니다.",
        });
        navigate('/admin');
      } else {
        toast({
          title: "접속 실패",
          description: "올바르지 않은 코드입니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error verifying access code:', error);
      toast({
        title: "접속 실패",
        description: "네트워크 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-mango-green-soft via-background to-mango-green-light">
      {/* 코드 입력 화면 */}
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-8">
          {/* 로고 */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-mango-green to-primary rounded-2xl flex items-center justify-center">
              <span className="text-white font-bold text-2xl">M</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">MangoFactory</h1>
              <p className="text-muted-foreground">교육 콘텐츠 관리 플랫폼</p>
            </div>
          </div>

          {/* 코드 입력 카드 */}
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <CardTitle>관리자 접속</CardTitle>
              <CardDescription>접속 코드를 입력하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCodeSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="access-code">접속 코드</Label>
                  <Input
                    id="access-code"
                    type="text"
                    placeholder=""
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-mango-green hover:bg-mango-green/90" 
                  disabled={isLoading || code.length === 0}
                >
                  {isLoading ? "접속 중..." : "접속하기"}
                </Button>
              </form>
              
              <div className="mt-4 pt-4 border-t border-border">
                <Button 
                  variant="outline"
                  onClick={() => navigate("/login")}
                  className="w-full"
                >
                  계정으로 로그인
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;