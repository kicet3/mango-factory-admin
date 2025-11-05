export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">관리자 페이지</h1>
          <p className="text-muted-foreground">망고팩토리 관리 시스템에 오신 것을 환영합니다</p>
        </div>
      </div>
    </div>
  );
}