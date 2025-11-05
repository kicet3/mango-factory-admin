# MangoFactory 관리자 허브 (Mango Admin Hub)

## 개요
MangoFactory 관리자 허브는 MangoFactory 서비스의 관리자 전용 웹 애플리케이션입니다. 이 시스템은 교육 관련 콘텐츠와 사용자를 효율적으로 관리할 수 있는 포괄적인 관리 도구를 제공합니다.

## 주요 기능
- 🔐 **교사 인증 관리**: 교사 자격 검증 및 승인 프로세스
- 📚 **교과서 관리**: 교과서 등록, 수정, AI 분석 기능
- 📝 **수업자료 관리**: 다양한 수업 포맷 및 교육 자료 관리
- 👥 **회원관리 (문의접수)**: 사용자 문의사항 처리 및 관리
- 🖼️ **이미지 데이터베이스 관리** (향후 개발 예정)

## 기술 스택

### 프론트엔드
- **React 18** with TypeScript
- **Vite** - 빌드 도구
- **React Router Dom** - 클라이언트 사이드 라우팅
- **Tailwind CSS** - 스타일링
- **shadcn/ui** - UI 컴포넌트 라이브러리
- **TanStack Query** - 서버 상태 관리
- **Sonner** - 토스트 알림

### 백엔드 & 데이터베이스
- **Supabase** - BaaS (Backend as a Service)
- **PostgreSQL** - 관계형 데이터베이스
- **Supabase Edge Functions** - 서버리스 함수
- **Row Level Security (RLS)** - 데이터 보안

### 파일 저장소
- **AWS S3** - 파일 업로드 및 저장

## 프로젝트 구조

```
mango-admin-hub/
├── src/
│   ├── components/          # 재사용 가능한 컴포넌트
│   │   ├── layout/         # 레이아웃 컴포넌트
│   │   │   ├── AdminLayout.tsx      # 메인 관리자 레이아웃
│   │   │   └── AdminSidebar.tsx     # 사이드바 네비게이션
│   │   ├── ui/             # shadcn/ui 기반 UI 컴포넌트들
│   │   └── ProtectedRoute.tsx       # 인증 보호 라우트
│   ├── contexts/           # React Context
│   │   └── AuthContext.tsx          # 인증 상태 관리
│   ├── pages/              # 페이지 컴포넌트들
│   │   ├── admin/          # 관리자 페이지들
│   │   │   ├── Dashboard.tsx        # 대시보드
│   │   │   ├── TeacherManagement.tsx # 교사 인증 관리
│   │   │   ├── TextbookManagement.tsx # 교과서 관리
│   │   │   ├── MaterialManagement.tsx # 수업자료 관리
│   │   │   └── UserManagement.tsx   # 회원관리 (문의접수)
│   │   ├── Index.tsx       # 홈 페이지
│   │   ├── Login.tsx       # 로그인 페이지
│   │   └── NotFound.tsx    # 404 페이지
│   ├── integrations/       # 외부 서비스 통합
│   │   └── supabase/       # Supabase 설정
│   ├── lib/                # 유틸리티 함수들
│   ├── hooks/              # 커스텀 훅
│   └── config/             # 설정 파일들
├── supabase/
│   ├── functions/          # Edge Functions (서버리스 함수들)
│   │   ├── admin-help-requests/     # 문의 요청 관리
│   │   ├── admin-teacher-data/      # 교사 데이터 관리
│   │   ├── analyze-course-material/ # 교과서 AI 분석
│   │   ├── analyze-generation-format/ # 수업자료 AI 분석
│   │   ├── upload-s3-file/         # S3 파일 업로드
│   │   ├── download-s3-file/       # S3 파일 다운로드
│   │   └── verify-admin-access/    # 관리자 권한 검증
│   └── migrations/         # 데이터베이스 마이그레이션
└── public/                 # 정적 파일들
```

## 주요 기능 상세

### 1. 교사 인증 관리 (`TeacherManagement.tsx`)
- **기능**: 교사 자격 증명 검토 및 승인
- **특징**:
  - 교사 인증 신청 목록 조회
  - 승인 대기/완료 상태 필터링
  - 인증 파일 다운로드 기능
  - 일괄 승인 처리
  - 실시간 상태 업데이트

### 2. 교과서 관리 (`TextbookManagement.tsx`)
- **기능**: 교과서 등록, 수정, 삭제 및 AI 분석
- **특징**:
  - 교과서 파일 업로드 (S3 연동)
  - 교과서 구조 수동 입력 또는 AI 자동 분석
  - 학년, 과목, 출판사별 필터링
  - 페이지네이션 지원
  - 교과서 메타데이터 관리

### 3. 수업자료 관리 (`MaterialManagement.tsx`)
- **기능**: 다양한 수업 포맷 및 교육 자료 관리
- **특징**:
  - 수업 스타일 및 협업 방식 태깅
  - AI 기반 자료 분석
  - 다중 선택 필터링
  - 파일 업로드 및 관리
  - 실시간 분석 상태 표시

### 4. 회원관리 (문의접수) (`UserManagement.tsx`)
- **기능**: 사용자 문의사항 처리 및 관리
- **특징**:
  - 문의 유형별 분류
  - 첨부파일 다운로드
  - 확인/미확인 상태 관리
  - 문의 내용 상세보기
  - 실시간 상태 업데이트

## 데이터베이스 구조

### 주요 테이블
- `admin_users`: 관리자 계정 정보
- `teacher_info`: 교사 인증 정보
- `raw_course_materials`: 원본 교과서 데이터
- `course_materials`: 분석된 교과서 데이터
- `raw_generation_formats`: 원본 수업자료
- `generation_formats`: 분석된 수업자료
- `help_requests`: 사용자 문의사항
- `courses`: 수업 정보
- `course_types`: 과목 분류
- `teaching_styles`: 수업 스타일
- `cowork_types`: 협업 방식

### 보안
- **Row Level Security (RLS)**: 테이블 레벨 보안 정책
- **관리자 권한 검증**: Edge Functions를 통한 관리자 권한 확인
- **JWT 토큰 기반 인증**: Supabase Auth 사용

## Edge Functions (서버리스 함수)

### 관리자 전용 함수들
- `admin-help-requests`: 문의 요청 데이터 조회
- `admin-teacher-data`: 교사 인증 데이터 관리
- `verify-admin-access`: 관리자 권한 검증

### AI 분석 함수들
- `analyze-course-material`: 교과서 AI 분석 처리
- `analyze-generation-format`: 수업자료 AI 분석 처리

### 파일 관리 함수들
- `upload-s3-file`: S3 파일 업로드 처리
- `download-s3-file`: S3 파일 다운로드 처리
- `delete-s3-file`: S3 파일 삭제 처리

## 인증 및 권한 관리

### 인증 플로우
1. 사용자 로그인 (`Login.tsx`)
2. Supabase Auth를 통한 JWT 토큰 발급
3. `AuthContext`를 통한 전역 인증 상태 관리
4. `ProtectedRoute`를 통한 라우트 보호
5. Edge Functions에서 관리자 권한 검증

### 권한 레벨
- **Basic Admin**: 기본 관리 기능 접근
- **Super Admin**: 모든 관리 기능 및 시스템 설정 접근

## 개발 환경 설정

### 필수 요구사항
- Node.js 18+
- npm 또는 yarn
- Supabase CLI

### 환경 변수
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 설치 및 실행
```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
```

## 배포 및 운영

### 빌드 설정
- **개발 빌드**: `npm run build:dev`
- **프로덕션 빌드**: `npm run build`

### 모니터링 및 로깅
- Supabase 대시보드를 통한 실시간 모니터링
- Edge Functions 로그 추적
- 에러 처리 및 사용자 피드백 시스템

## 향후 개발 계획
- 🖼️ 이미지 데이터베이스 관리 기능
- 📊 고급 분석 및 리포팅 기능
- 🔔 실시간 알림 시스템
- 📱 모바일 반응형 개선
- 🚀 성능 최적화

## 기여 가이드라인
이 프로젝트는 MangoFactory 내부 관리 도구로, 기여는 팀 내부에서만 이루어집니다.

## 라이선스
내부 프로젝트 - 모든 권리 보유

---
*이 문서는 MangoFactory 관리자 허브의 구조와 기능을 이해하기 위한 가이드입니다.*
