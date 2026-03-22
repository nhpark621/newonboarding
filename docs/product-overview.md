# UNDERWATCH — Product Overview

> 이 문서는 PM, 디자이너, 기획자가 제품의 목표, 구조, 기능, 데이터 흐름을 빠르게 파악할 수 있도록 작성되었습니다.

---

## 1. Product Goal & Target Users

### 제품 목표

UNDERWATCH는 경쟁사 분석 SaaS 서비스를 **가입 전에 직접 체험**하게 함으로써 고객 전환율을 높이기 위한 **체험형 B2B 온보딩 플랫폼**입니다.

기존 방식(PDF 샘플 리포트 발송)을 대체하는 **Superior MLP(Minimum Lovable Product)** 로, 사용자가 자신의 고민을 직접 입력하고 AI 추천을 받으며 실제 서비스 가치를 경험하는 과정을 통해 전환 의향을 높이는 것이 핵심 목적입니다.

### 핵심 가설

> "사용자가 직접 자신의 고민을 입력하고 맞춤 결과를 받으면, 단순 자료 열람보다 전환율이 높아진다."

### 타겟 사용자

| 사용자 유형 | 설명 |
|------------|------|
| **마케팅 담당자** | 경쟁사 광고, SNS, 이벤트 현황을 추적하고 싶은 실무자 |
| **기획/전략팀** | 경쟁사 신제품 출시 동향과 시장 흐름을 파악해야 하는 기획자 |
| **인사이트/데이터 분석팀** | 정기적 경쟁사 리포트가 필요한 분석가 |
| **스타트업 대표 / 팀장** | 소규모로 경쟁사를 빠르게 모니터링하고 싶은 결정권자 |

### 핵심 설계 원칙

- **마찰 최소화** — 이메일, 비밀번호, 이용약관 동의 없음. 회사/팀/제품 정보만으로 시작
- **즉각적 가치 제공** — 입력 즉시 AI가 맞춤 서비스를 추천하고 데모 대시보드로 연결
- **개인화 경험** — 사용자가 입력한 고민과 경쟁사 정보를 기반으로 맞춤 결과 제공

---

## 2. Core User Flows

### 전체 흐름 요약

```
진입 (/) → Step 1: 고민 입력 → [로딩 애니메이션] → Step 2: 서비스 추천 → Step 3: 비즈니스 정보 등록 → 성공 모달 → 대시보드 (/dashboard)
```

### 상세 플로우

#### Flow A — 신규 사용자 (전체 온보딩)

```
1. 홈페이지 접속
2. 텍스트 입력창에 경쟁사 관련 고민 작성
   └─ 선택: 빠른 태그 클릭 (신제품 출시, 광고 발행, HR 채용, SNS 분석)
3. "맞춤 분석 서비스 확인하기" 버튼 클릭
4. AI 매칭 로딩 화면 (2.5초) — 분석 중 → 매칭 중 → 완료
5. AI 추천 서비스 카드 확인 (최대 3개 선택)
6. "분석하기" 버튼 클릭
7. 비즈니스 정보 폼 작성
   ├─ 회사명 (필수)
   ├─ 소속 팀 선택 (필수)
   ├─ 담당 제품/서비스 (필수)
   └─ 모니터링 경쟁사 추가 (선택 — 미입력 시 AI 자동 선정)
8. "경쟁사 분석 대시보드 보기" 제출
9. 성공 모달 확인 → "대시보드 시작하기" 클릭
10. /dashboard 이동
```

#### Flow B — 단계 재방문 (뒤로 이동)

- 헤더의 뒤로가기 버튼으로 이전 단계 이동 가능
- 상단 진행 바(1·2·3)를 클릭하면 완료된 단계로 즉시 이동 가능
- 미완료 단계는 클릭 비활성화 (ex. Step 1을 건너뛰고 Step 2로 이동 불가)

#### Flow C — 브랜드 스토어 탐색 (대시보드)

```
1. /dashboard 접속
2. "브랜드 직영 스토어 이벤트 탐색" 섹션 확인
3. 온보딩에서 등록한 경쟁사 및 제품 정보 표시됨
4. "브랜드 스토어 탐색" 버튼 클릭
5. 서버가 경쟁사별로 도메인을 탐색하고 e커머스 플랫폼 감지
6. 이벤트/프로모션 페이지 후보 목록 테이블로 표시
7. 체크박스로 원하는 채널 선택
8. "선택 항목 저장" 클릭 → 채널 및 이벤트 페이지 DB 저장
```

---

## 3. Detailed Feature Breakdown

### 3-1. 빠른 태그 입력 (Step 1)

- 4개의 사전 정의 태그 제공: 신제품 출시 현황 / 광고 발행 / HR 인재채용 / SNS 게시물 분석
- 태그 클릭 시 자동으로 문장이 생성되어 입력창에 **추가** (기존 내용 덮어쓰지 않음)
  - 예: "경쟁사의 신제품 출시 현황에 대해 궁금해요."
- 직접 타이핑과 태그 클릭 동시 사용 가능
- 최대 200자 제한, 실시간 글자 수 표시
- 빈 입력 시 다음 단계 버튼 비활성화

### 3-2. AI 서비스 매칭 로딩 화면

- Step 1 완료 시 2.5초 간 표시되는 전환 화면
- 3단계 프로그레스 표시: **분석 중 → 매칭 중 → 완료**
  - 0.0s: 분석 중 (파란 원 활성화)
  - 0.8s: 매칭 중 (두 번째 원 활성화, 첫 번째 체크 처리)
  - 1.6s: 완료 (세 번째 원 초록색으로 전환)
  - 2.5s: 화면 전환 → Step 2
- 사용자에게 "무언가 진행 중"이라는 신뢰감과 기대감 형성

### 3-3. AI 서비스 추천 (Step 2)

- OpenAI GPT-4o 기반, 사용자 입력을 분석해 6개 서비스 중 3~4개 추천

| 서비스명 | 설명 요약 |
|---------|---------|
| 뉴스·보도자료 분석 | 최신 뉴스 이슈, 전략 방향 파악 |
| 신제품·서비스 출시 | 경쟁사 신제품·기능 확장 현황 정리 |
| 인재 영입 | 채용 공고로 전략 변화 예측 |
| 광고 분석 | 광고 집행 시기·내용·채널 분석 |
| SNS 콘텐츠 | 채널별 콘텐츠 성과 비교 |
| 이벤트 모니터링 | 프로모션·할인·혜택 구성 추적 |

- 추천 서비스는 상단에 "추천" 배지와 함께 강조 표시
- 나머지 서비스는 "기타 서비스"로 구분하여 하단 노출
- 최대 3개까지 선택 가능 / 3개 초과 시 나머지 카드 반투명 처리
- 선택 항목은 하단 "선택된 분석 서비스" 요약 바에 실시간 표시, 개별 제거 가능
- AI 응답 로딩 중에는 스켈레톤 UI 4개 표시

### 3-4. 비즈니스 정보 등록 (Step 3)

**필수 입력 항목:**
- **회사명** — 텍스트 입력, 값 입력 시 초록 체크 아이콘 표시
- **소속 팀** — 드롭다운 선택 (마케팅팀 / 기획·전략팀 / 인사이트팀 / 데이터 분석팀 / 기타)
- **담당 제품/서비스명** — 텍스트 입력

**선택 입력 항목:**
- **모니터링 경쟁사** — 복수 입력 가능한 태그 방식
  - 이름 입력 후 Enter 또는 "추가" 버튼으로 태그 생성
  - 태그 우측 ✕ 버튼으로 개별 삭제
  - 미입력 시 "AI가 자동 선정" 안내 문구 노출

**폼 검증:**
- Zod 스키마 기반 실시간 유효성 검사
- 필수 항목 미입력 시 하단에 오류 메시지 표시
- 모든 필수 항목 완료 전까지 제출 버튼 비활성화

**제출 후 처리:**
1. `/api/register` 호출 → 사용자 정보 저장
2. `/api/onboarding-session` 호출 → 전체 온보딩 데이터 세션 저장
3. `localStorage`에 사용자 정보 저장 (대시보드에서 활용)
4. 성공 모달 표시

### 3-5. 성공 모달

- 초록 체크 원형 아이콘 + 완료 메시지
- "대시보드 시작하기" 버튼 클릭 시 `/dashboard` 이동
- 버튼에 shimmer(빛 반짝임) 애니메이션 적용

### 3-6. 브랜드 직영 스토어 이벤트 탐색 (Dashboard)

**탐색 프로세스:**
1. 경쟁사 이름에서 도메인 후보 자동 생성
   - 예: `올리브영` → `oliveyoung.com`, `store.oliveyoung.com`, `oliveyoungstore.com` 등
2. 각 도메인에 HTTP 요청을 보내 유효한 사이트 확인 (5초 타임아웃)
3. 홈페이지 HTML 파싱으로 e커머스 플랫폼 감지
   - 감지 플랫폼: Cafe24, Godomall, MakeShop, Shopify, WordPress, Generic
4. 플랫폼별 이벤트/프로모션 경로 후보 생성 및 점수 계산
5. 상위 후보를 테이블로 반환

**점수 산정 기준:**
| 기준 | 점수 |
|------|------|
| 탐색 대상 도메인 내부 URL | +3 |
| 이벤트 키워드 포함 (event, sale, promo 등) | +2 |
| 플랫폼별 전형적인 경로 패턴 | +2 |
| URL 내 경쟁사명 포함 | +1 |

**결과 테이블 컬럼:** 선택 체크박스 / 경쟁사 / 도메인 / 플랫폼 / 이벤트 경로 수 / 점수

**저장 흐름:**
- 체크박스로 원하는 항목 선택
- "선택 항목 저장" 클릭 → Channel(채널) 및 EventPage(이벤트 페이지) 레코드 생성
- 저장 성공 시 토스트 알림 표시, 체크박스 초기화

---

## 4. Page-by-Page Description

### `/` — 온보딩 홈 (Home)

**역할:** 전체 온보딩 플로우의 진입점이자 컨테이너. 단계 관리, 상태 저장, 전환 제어를 담당합니다.

**포함 요소:**
- 상단 헤더: UNDERWATCH 로고 + 진행 바 (뒤로가기 버튼 포함)
- 단계별 콘텐츠 영역: Step1 / 로딩 화면 / Step2 / Step3 중 하나 표시
- 단계 간 애니메이션: `fade-in`, `slide-up` CSS 클래스 활용

**상태 흐름:**
```
currentStep: 1 → (Step1 완료) → showMatching: true → (2.5초 후) → currentStep: 2 → (Step2 완료) → currentStep: 3 → (Step3 완료) → navigate('/dashboard')
```

**진행 바 클릭 규칙:**
- Step 1: 항상 클릭 가능
- Step 2: `userConcern`이 입력된 경우에만 클릭 가능
- Step 3: `userConcern`과 `selectedServices` 모두 있는 경우에만 클릭 가능

---

### `/dashboard` — 분석 대시보드 (Dashboard)

**역할:** 온보딩 완료 후 사용자가 실제 서비스를 체험하는 데모 공간. 현재는 상태 카드와 브랜드 스토어 탐색 기능을 제공합니다.

**포함 요소:**
1. 헤더: 로고 + "경쟁사 분석 대시보드" 레이블
2. 상태 카드 3개: 온보딩 완료 / 대시보드 준비 중 / 데이터 수집 시작
3. 브랜드 직영 스토어 이벤트 탐색 섹션

**데이터 소스:**
- `localStorage`의 `onboarding_user_data` 키에서 회사/제품/경쟁사 정보 읽기
- 탐색 결과는 컴포넌트 로컬 상태(`useState`)로 관리

---

## 5. Key Components & Their Responsibilities

### `Home` (`pages/home.tsx`)

- **역할:** 온보딩 플로우 전체 오케스트레이터
- **책임:**
  - `currentStep` 상태로 어떤 Step 컴포넌트를 렌더링할지 결정
  - `onboardingData` 객체로 각 단계 데이터를 누적 관리
  - 로딩 화면 타이머 관리 (`matchingStage` 상태)
  - 단계 이동 가능 여부 판단 및 진행 바에 전달

---

### `Step1` (`components/onboarding/step1.tsx`)

- **역할:** 사용자 고민 입력 인터페이스
- **책임:**
  - 자유 텍스트 입력 + 태그 클릭으로 문장 자동 생성
  - 200자 제한 카운터 표시
  - 입력값이 있을 때만 다음 버튼 활성화
  - 이벤트 트래킹 (`tag_selected`, `input_started`)
- **Props:** `onComplete(userConcern: string) → void`

---

### `Step2` (`components/onboarding/step2.tsx`)

- **역할:** AI 추천 서비스 선택 인터페이스
- **책임:**
  - 마운트 시 `/api/recommend-services` 호출 (TanStack Query)
  - 추천 서비스 / 기타 서비스 그룹으로 분리 표시
  - 서비스 선택/해제 토글 (최대 3개)
  - 선택 요약 바 및 개별 제거 버튼 관리
  - 로딩 중 스켈레톤 UI 표시
  - 이벤트 트래킹 (`card_shown`, `card_clicked`)
- **Props:** `userConcern: string`, `onComplete(selectedServices: string[]) → void`

---

### `Step3` (`components/onboarding/step3.tsx`)

- **역할:** 비즈니스 정보 등록 폼
- **책임:**
  - React Hook Form + Zod로 폼 상태 및 유효성 관리
  - 경쟁사 멀티 태그 입력 (별도 로컬 상태로 관리)
  - `/api/register` → `/api/onboarding-session` 순차 호출
  - `localStorage`에 사용자 데이터 저장
  - 성공 모달 표시 및 대시보드 이동 처리
- **Props:** `onboardingData: OnboardingData`, `onComplete(userData) → void`

---

### `ProgressIndicator` (`components/onboarding/progress-indicator.tsx`)

- **역할:** 온보딩 진행 상황 시각화 + 단계 이동 네비게이션
- **책임:**
  - 현재 단계에 따른 스타일 변화 (활성/비활성/완료)
  - 이동 가능 단계만 클릭 허용 (`canNavigate` prop 기반)
  - 단계 간 연결선 진행률 표시
- **Props:** `currentStep`, `onStepClick`, `canNavigate`

---

### `Dashboard` (`pages/dashboard.tsx`)

- **역할:** 데모 대시보드 및 브랜드 스토어 탐색 인터페이스
- **책임:**
  - `localStorage`에서 온보딩 데이터 읽기
  - `/api/brandstore/discover` 호출 및 결과 상태 관리
  - 후보 테이블 렌더링 및 선택 상태 관리 (`Set<string>`)
  - `/api/brandstore/approve` 호출로 선택 항목 저장
  - `discoverMutation.isPending` 기반 버튼 상태 제어

---

## 6. State Management & Data Flow

### 상태 관리 방식

이 프로젝트는 전역 상태 라이브러리(Redux, Zustand 등)를 사용하지 않습니다. 대신 세 가지 방식으로 상태를 관리합니다.

| 방식 | 사용 위치 | 용도 |
|------|-----------|------|
| `useState` (로컬) | 각 컴포넌트 | 단계 데이터, UI 상태, 폼 입력값 |
| TanStack React Query | Step2, Dashboard | 서버 API 호출 상태 및 캐싱 |
| `localStorage` | Step3 → Dashboard | 온보딩 완료 데이터 브라우저 영속 저장 |

---

### 데이터 흐름 다이어그램

```
[Step1]
  └─ userConcern (string)
        │
        ▼ props
[Home] → onboardingData.userConcern
        │
        ▼ API call
[Step2] ─── POST /api/recommend-services ──► OpenAI GPT-4o
  └─ selectedServices (string[])
        │
        ▼ props
[Home] → onboardingData.selectedServices
        │
        ▼ props
[Step3]
  ├── POST /api/register ──────────────────► DB: users 테이블
  │    └─ { company, team, product, competitors }
  ├── POST /api/onboarding-session ─────────► DB: onboarding_sessions 테이블
  │    └─ { userConcern, selectedServices, userId }
  └── localStorage.setItem('onboarding_user_data', ...)
                │
                ▼ navigate('/dashboard')
[Dashboard]
  └── localStorage.getItem('onboarding_user_data')
        │
        ▼ user action
  POST /api/brandstore/discover ───────────► 외부 도메인 탐색 (Node fetch)
        │
        ▼ candidates[]
  POST /api/brandstore/approve ────────────► DB: channels, event_pages 테이블
```

---

### 온보딩 데이터 구조

```typescript
// Home 컴포넌트가 관리하는 누적 상태
interface OnboardingData {
  userConcern: string;           // Step 1에서 입력한 고민 텍스트
  selectedServices: string[];    // Step 2에서 선택한 서비스 이름 목록
  userData?: {
    company: string;             // 회사명
    team: string;                // 팀/부서
    product: string;             // 담당 제품/서비스
    competitors?: string[];      // 모니터링 경쟁사 목록 (선택)
  };
}
```

---

## 7. API Integration Structure

### 기본 설정

- 모든 API 호출은 `client/src/lib/queryClient.ts`의 `apiRequest` 함수를 통해 수행
- GET 요청: TanStack Query의 `useQuery` 사용 (자동 캐싱)
- POST/PATCH/DELETE 요청: `useMutation` + `apiRequest` 함수 조합

```typescript
// apiRequest 사용 예시
const response = await apiRequest('POST', '/api/register', {
  company: "회사명",
  team: "marketing",
  product: "제품명",
  competitors: ["경쟁사A"],
});
const data = await response.json();
```

---

### API 엔드포인트 상세

#### `POST /api/recommend-services`
- **호출 위치:** Step2 마운트 시 자동 호출
- **요청:**
  ```json
  { "userInput": "경쟁사의 신제품 출시 현황이 궁금해요." }
  ```
- **응답:**
  ```json
  { "recommended_services": ["신제품·서비스 출시", "이벤트 모니터링", "광고 분석"] }
  ```
- **실패 시:** 기본값 3개 서비스 반환 (사용자에게 오류 노출하지 않음)

---

#### `POST /api/register`
- **호출 위치:** Step3 폼 제출 시
- **요청:**
  ```json
  {
    "company": "주식회사 언더워치",
    "team": "marketing",
    "product": "화장품 브랜드 A",
    "competitors": ["올리브영", "아리따움"]
  }
  ```
- **응답:**
  ```json
  {
    "id": "uuid",
    "company": "주식회사 언더워치",
    "team": "marketing",
    "product": "화장품 브랜드 A",
    "competitors": ["올리브영", "아리따움"]
  }
  ```

---

#### `POST /api/onboarding-session`
- **호출 위치:** `register` 성공 직후 자동 호출
- **요청:**
  ```json
  {
    "userConcern": "경쟁사의 신제품 출시 현황이 궁금해요.",
    "selectedServices": ["신제품·서비스 출시", "이벤트 모니터링"],
    "userId": "uuid"
  }
  ```
- **응답:** 저장된 세션 객체

---

#### `POST /api/brandstore/discover`
- **호출 위치:** Dashboard "브랜드 스토어 탐색" 버튼 클릭 시
- **요청:**
  ```json
  {
    "competitors": ["올리브영", "아리따움"],
    "productOrService": "화장품"
  }
  ```
- **처리 과정:**
  1. 경쟁사 이름 → 도메인 후보 목록 생성
  2. 각 도메인 HTTP 탐색 (5초 타임아웃)
  3. 홈페이지 HTML로 플랫폼 감지
  4. 이벤트 경로 후보 생성 및 점수 계산
- **응답:**
  ```json
  {
    "candidates": [
      {
        "competitor": "올리브영",
        "baseUrl": "https://www.oliveyoung.co.kr",
        "platform": "generic",
        "eventPaths": [
          "https://www.oliveyoung.co.kr/event",
          "https://www.oliveyoung.co.kr/promotion"
        ],
        "score": 4.5
      }
    ]
  }
  ```

---

#### `POST /api/brandstore/approve`
- **호출 위치:** Dashboard "선택 항목 저장" 버튼 클릭 시
- **요청:**
  ```json
  {
    "selections": [
      {
        "competitor": "올리브영",
        "baseUrl": "https://www.oliveyoung.co.kr",
        "platform": "generic",
        "eventPaths": ["https://www.oliveyoung.co.kr/event"]
      }
    ]
  }
  ```
- **처리 과정:** 각 selection → Channel 레코드 생성 → EventPage 레코드 생성
- **응답:**
  ```json
  {
    "channels": [{ "id": "uuid", "name": "올리브영 브랜드 스토어", ... }],
    "eventPages": [{ "id": "uuid", "url": "...", "status": "new", ... }]
  }
  ```

---

### 이벤트 트래킹 (`lib/tracking.ts`)

현재 콘솔 출력 방식으로 구현되어 있으며, GA4 또는 커스텀 분석 도구로 연동 예정입니다.

| 이벤트명 | 발생 시점 | 파라미터 |
|---------|---------|---------|
| `input_started` | 텍스트 입력 시작 | `{ method: 'manual' }` |
| `tag_selected` | 태그 클릭 | `{ tag_name: string }` |
| `auto_text_generated` | 태그 클릭으로 텍스트 생성 | `{ generated_text: string }` |
| `step1_completed` | Step 1 완료 | — |
| `card_shown` | Step 2 카드 표시 | `{ count: number }` |
| `card_clicked` | 서비스 카드 선택 | `{ selected_card: string }` |
| `signup_started` | Step 3 진입 | — |
| `signup_completed` | 폼 제출 완료 | — |
| `onboarding_completed` | 전체 온보딩 완료 | — |

```typescript
// GA4 연동 예시 (주석 해제 후 사용)
if (typeof gtag !== 'undefined') {
  gtag('event', eventName, parameters);
}
```

---

## 부록: 데이터베이스 스키마 요약

| 테이블 | 주요 컬럼 | 역할 |
|--------|---------|------|
| `users` | company, team, product, competitors[] | 온보딩 사용자 정보 |
| `onboarding_sessions` | userConcern, selectedServices (JSON), userId | 온보딩 세션 데이터 |
| `channels` | type, competitorId, baseUrl, platform | 모니터링 채널 (브랜드 스토어 등) |
| `event_pages` | channelId, url, status | 채널 내 이벤트 페이지 |

> 개발 환경에서는 모든 데이터가 In-memory 저장소(MemStorage)에 저장되며, 서버 재시작 시 초기화됩니다. 프로덕션 전환 시 PostgreSQL(Neon Serverless) 연결이 필요합니다.
