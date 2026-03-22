# UNDERWATCH — 경쟁사 분석 온보딩 플랫폼

> AI 기반 경쟁사 분석 서비스를 체험형 온보딩으로 소개하는 B2B 인터랙티브 웹 애플리케이션

---

## Overview

UNDERWATCH는 잠재 고객이 실제 서비스를 경험하며 가치를 직접 확인할 수 있도록 설계된 **체험형 B2B 온보딩 플랫폼**입니다.

기존 PDF 샘플 리포트 방식을 넘어, 사용자가 자신의 경쟁 고민을 입력하면 AI가 맞춤 서비스를 추천하고, 비즈니스 정보를 등록하면 곧바로 데모 대시보드에 접근할 수 있습니다. 이메일·비밀번호 없이 회사명·팀·제품 정보만으로 시작할 수 있어 진입 장벽이 최소화되어 있습니다.

---

## Key Features

- **3단계 온보딩 플로우** — 고민 입력 → AI 서비스 추천 → 비즈니스 정보 등록의 순차적 흐름
- **AI 서비스 추천** — OpenAI GPT-4o가 사용자 입력을 분석해 6개 카테고리 중 최적의 분석 서비스 3~4개를 추천
- **인증 없는 온보딩** — 이메일·비밀번호 없이 회사/팀/제품 정보만으로 가입 완료
- **경쟁사 등록** — 모니터링할 경쟁사를 직접 추가하거나, 비워두면 AI가 자동 선정
- **브랜드 직영 스토어 이벤트 탐색** — 경쟁사 도메인을 자동 탐색하고, e커머스 플랫폼을 감지하여 이벤트·프로모션 페이지를 자동 발견
- **단계 진행 표시기** — 클릭 가능한 진행 바로 단계 간 자유롭게 이동
- **이벤트 트래킹** — GA4 또는 커스텀 분석과 연동 가능한 행동 트래킹 시스템 내장

---

## Page / Screen Structure

```
/           → 온보딩 홈 (3단계 플로우)
│
├── Step 1: 고민 입력
│   ├── 자유 텍스트 입력창
│   └── 빠른 선택 태그 (신제품 출시, 광고 발행, HR 채용, SNS 분석)
│
├── Step 2: AI 서비스 추천
│   ├── 로딩 애니메이션 (분석 중 → 매칭 중 → 완료)
│   └── 추천 서비스 카드 선택 (뉴스/신제품/인재/광고/SNS/이벤트)
│
└── Step 3: 비즈니스 정보 등록
    ├── 회사명, 팀/부서, 제품·서비스명 입력
    ├── 경쟁사 멀티 태그 입력 (선택사항)
    └── 완료 모달 → 대시보드 이동 버튼

/dashboard  → 분석 대시보드
├── 온보딩 완료 상태 카드
└── 브랜드 직영 스토어 이벤트 탐색
    ├── 경쟁사/제품 정보 표시
    ├── 탐색 버튼 → 도메인 발견 및 플랫폼 감지 실행
    ├── 후보 테이블 (경쟁사, 도메인, 플랫폼, 이벤트 경로, 점수)
    └── 선택 체크박스 → 저장 버튼
```

---

## Tech Stack

| 영역 | 기술 |
|------|------|
| **Frontend** | React 18, TypeScript, Vite |
| **Routing** | Wouter |
| **UI 컴포넌트** | shadcn/ui, Radix UI |
| **스타일링** | Tailwind CSS |
| **서버 상태 관리** | TanStack React Query v5 |
| **폼 처리** | React Hook Form + Zod |
| **애니메이션** | Framer Motion |
| **Backend** | Express.js, TypeScript |
| **AI** | OpenAI GPT-4o |
| **ORM** | Drizzle ORM |
| **DB 스키마 검증** | drizzle-zod |
| **개발 DB** | In-memory storage (MemStorage) |
| **프로덕션 DB** | PostgreSQL (Neon Serverless) |
| **빌드** | Vite (프론트), esbuild (서버) |
| **아이콘** | Lucide React, React Icons |

---

## Installation & Run

### 사전 요구사항

- Node.js 20+
- npm
- OpenAI API 키

### 설치

```bash
# 의존성 설치
npm install
```

### 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 아래 값을 설정합니다.

```env
OPENAI_API_KEY=your_openai_api_key_here
DATABASE_URL=your_postgres_connection_string   # 프로덕션 DB 사용 시
```

### 개발 서버 실행

```bash
npm run dev
```

Express 백엔드와 Vite 개발 서버가 동일한 포트에서 함께 실행됩니다.

### 프로덕션 빌드

```bash
npm run build
npm run start
```

### 데이터베이스 마이그레이션 (PostgreSQL 사용 시)

```bash
npm run db:push
```

---

## Folder Structure

```
.
├── client/                        # 프론트엔드 (React + Vite)
│   └── src/
│       ├── components/
│       │   ├── onboarding/        # 3단계 온보딩 컴포넌트
│       │   │   ├── step1.tsx      # 고민 입력 화면
│       │   │   ├── step2.tsx      # AI 서비스 추천 화면
│       │   │   ├── step3.tsx      # 비즈니스 정보 등록 화면
│       │   │   └── progress-indicator.tsx  # 단계 진행 표시기
│       │   └── ui/                # shadcn/ui 기본 컴포넌트
│       ├── pages/
│       │   ├── home.tsx           # 온보딩 플로우 진입점 (/)
│       │   ├── dashboard.tsx      # 분석 대시보드 (/dashboard)
│       │   └── not-found.tsx      # 404 페이지
│       ├── lib/
│       │   ├── queryClient.ts     # TanStack Query 설정 및 apiRequest
│       │   └── tracking.ts        # 이벤트 트래킹 유틸
│       ├── hooks/
│       │   └── use-toast.ts       # Toast 알림 훅
│       ├── App.tsx                # 라우터 정의
│       └── main.tsx               # 앱 진입점
│
├── server/                        # 백엔드 (Express.js)
│   ├── index.ts                   # 서버 진입점
│   ├── routes.ts                  # API 라우트 정의
│   ├── storage.ts                 # 스토리지 인터페이스 및 MemStorage 구현
│   ├── brandstore-service.ts      # 브랜드 스토어 탐색 로직 (도메인 발견, 플랫폼 감지, 점수 계산)
│   └── vite.ts                    # Vite 미들웨어 통합 (개발용)
│
├── shared/
│   └── schema.ts                  # Drizzle ORM 스키마 + Zod 타입 정의 (프론트·백 공유)
│
├── attached_assets/               # 로고 등 정적 자산
├── drizzle.config.ts              # Drizzle Kit 설정
├── tailwind.config.ts             # Tailwind CSS 설정
├── vite.config.ts                 # Vite 빌드 설정
├── tsconfig.json                  # TypeScript 설정
└── components.json                # shadcn/ui 설정
```

---

## API Endpoints

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/api/recommend-services` | GPT-4o 기반 서비스 추천 |
| `POST` | `/api/register` | 사용자 비즈니스 정보 등록 |
| `POST` | `/api/onboarding-session` | 온보딩 세션 저장 |
| `POST` | `/api/brandstore/discover` | 경쟁사 브랜드 스토어 탐색 |
| `POST` | `/api/brandstore/approve` | 선택한 채널 및 이벤트 페이지 저장 |

---

## Future Improvements / Roadmap

- **실시간 모니터링 대시보드** — 저장된 채널의 이벤트 페이지를 주기적으로 크롤링하고 변경사항 알림
- **경쟁사별 분석 리포트** — 뉴스, 신제품, SNS, 광고 데이터를 통합한 종합 리포트 자동 생성
- **Slack / 이메일 알림** — 경쟁사 이벤트 감지 시 팀 채널로 즉시 알림 발송
- **PostgreSQL 전환** — 현재 개발용 In-memory 스토리지를 프로덕션 PostgreSQL로 완전 전환
- **다중 사용자 지원** — 팀 워크스페이스 및 초대 기반 협업 기능
- **분석 카테고리 확장** — 특허, 채용 공고, 가격 변동, 리뷰 분석 등 추가 데이터 소스
- **GA4 연동 완성** — 현재 내장된 이벤트 트래킹 시스템을 Google Analytics 4와 정식 연동
- **다국어 지원** — 현재 한국어 전용 UI를 영어 등 다국어로 확장
