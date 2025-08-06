# /context/design-principles.md

## 1. Overall Design Philosophy
이 웹페이지는 B2B 리서치 및 컨설팅 회사를 위한 공식 서비스 소개 사이트로, 경쟁사 분석 서비스를 체험할 수 있는 구조로 구성함. 잠재 고객이 분석 서비스의 핵심 가치를 직접 체험하고, 서비스 대시보드까지 자연스럽게 도달하도록 유도하는 사용자 경험을 목표로 함. 디자인은 깔끔하고 직관적이며, 정보 신뢰도를 전달하는 구조로 구성함.

## 2. Layout Guidelines
- 12컬럼 그리드 시스템 기반 레이아웃 구성
- 주요 콘텐츠는 명확한 시각적 구획으로 나누어 배치
- 히어로 섹션 → 서비스 소개 → 문제 정의 → 체험 유도 순서로 구성
- 회원가입/온보딩은 단계별 진행 구조(Wizard 형식)를 따름

## 3. Typography
- 기본 폰트: Noto Sans KR
- 제목 계층 구조:
  - H1: 32px / Bold
  - H2: 24px / Semi-bold
  - H3: 18px / Medium
  - 본문: 16px / Regular
- 줄 간격(line-height)은 1.5배 기준

## 4. Color Palette
- Primary Color: `rgb(0, 91, 249)` (신뢰감 전달)
- Accent Color: `rgb(255, 179, 0)` (CTA 및 주요 포인트 강조)
- Text: `#1E1E1E`
- Background: `#FFFFFF` (전체 배경)
- Secondary Background: `#F5F7FA` (섹션 구분용 회색 배경)

## 5. Components & UI Elements
- 버튼:
  - Primary 버튼은 키컬러 (rgb(0, 91, 249)) 사용
  - Secondary 버튼은 테두리만 적용, hover 시 배경 색상 반전
- 카드:
  - 그림자 없는 플랫 스타일, border-radius: 12px
  - 마우스오버 시 살짝 확대되는 효과
- 탭/필터: 명확한 상태 구분 강조 (active 상태 색상)
- 입력창: 선명한 테두리 + 오류 발생 시 빨간색 안내 텍스트 표시

## 6. Responsiveness
- PC 우선 디자인
- 1440px 기준으로 디자인하며, 최소 1200px까지 대응
- 모바일 반응형은 후순위이나 추후 확장 가능성 고려하여 컴포넌트 설계

## 7. Accessibility
- 모든 CTA 버튼은 명확한 텍스트 포함 (아이콘-only 금지)
- 대비 비율 WCAG 2.0 기준 준수 (텍스트 vs 배경 대비)
- 폼 요소에 aria-label 및 오류 메시지 제공

## 8. Tone & Visual Style
- 톤: 전문적이고 신뢰감 있는 톤
- 스타일: 미니멀 + 모던, 불필요한 장식 배제
- 이미지: 데이터 기반 분석 느낌 강조 (차트, 그래프, 대시보드 예시)

## 9. Animation & Interaction
- 페이지 진입 시 페이드인 효과 (0.3~0.5초)
- 버튼 hover 시 부드러운 색상 전환 효과
- 온보딩 단계는 진행률 표시 및 다음 단계로의 부드러운 전환

## 10. Visual Examples
- 참고 사이트: https://bubble.io
  - 깨끗한 배경, 명확한 섹션 구분, CTA 강조 방식 참고
  - 위계 구조가 잘 드러나는 콘텐츠 배치 참고
