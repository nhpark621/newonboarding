# 체험형 경쟁사 분석 대시보드 온보딩 프로세스

## Overview

This is an interactive B2B onboarding web application designed to showcase a competitive analysis service through an experiential approach. The system guides potential customers through a 3-step process: inputting their competitive concerns, receiving AI-powered service recommendations, and completing registration to access a demo dashboard. The application serves as a Superior MLP (Minimum Lovable Product) to test real user engagement and improve conversion rates beyond traditional PDF sample reports.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, built using Vite for fast development and hot module replacement
- **Routing**: Wouter for lightweight client-side routing with two main routes (`/` for onboarding, `/dashboard` for post-registration experience)
- **UI Framework**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- **State Management**: React hooks with TanStack React Query for server state management and form handling via React Hook Form
- **Design System**: Custom design tokens following Korean B2B aesthetic with primary blue (`rgb(0, 91, 249)`) and accent orange (`rgb(255, 179, 0)`) color scheme

### Backend Architecture
- **Server Framework**: Express.js with TypeScript for RESTful API endpoints
- **Request Processing**: Custom middleware for logging API calls and JSON response capture
- **Error Handling**: Centralized error handling middleware with proper HTTP status codes
- **Development Integration**: Vite middleware integration for seamless development experience with HMR

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Design**: 
  - Users table with business information (company, team, product, competitors array) - no authentication required
  - Onboarding sessions table linking user concerns to selected services via JSON fields
- **Development Storage**: In-memory storage implementation for rapid prototyping and testing
- **Migration System**: Drizzle Kit for database schema migrations and management

### Data Collection (No Authentication)
- **Business Information Focus**: Collecting business context instead of user credentials to reduce friction
- **Form Validation**: Zod schema validation for type-safe form processing
- **Required Fields**: Company name, team/department, product/service
- **Optional Fields**: Competitors to monitor (multi-entry text field with add/remove functionality)
- **Flexible Competitor Tracking**: Users can add multiple competitors or skip to receive AI-selected competitor insights

### External Service Integrations
- **AI Recommendations**: OpenAI GPT-4o integration for analyzing user input and recommending relevant competitive analysis services
- **Service Mapping**: Predefined service categories (news analysis, product launches, HR recruitment, advertising, social media, events) mapped to user concerns
- **Analytics Tracking**: Event tracking system prepared for GA4 or custom analytics integration

### Multi-Step Onboarding Flow
- **Step 1**: Concern input with predefined tags and auto-completion for faster user engagement
  - Enhanced tag functionality: clicking tags appends text to existing input instead of replacing
  - Simplified auto-generated text without redundant phrases
  - Removed auto-generated text preview for cleaner UX
  - Loading screen with progressive animation (분석 중 → 매칭 중 → 완료) between Step 1 and Step 2
- **Step 2**: AI-powered service recommendation with interactive card selection and hover previews
- **Step 3**: Business information form collecting company details for competitor analysis onboarding
  - **No authentication required**: Removed email/password fields to reduce friction and focus on business needs
  - **Required fields**: Company name, team/department selection, product/service name
  - **Optional multi-entry competitors field**: Users can add/remove multiple competitors or skip entirely
  - **AI-powered fallback**: If competitors are skipped, AI auto-selects relevant competitors for demo insights
  - **Success modal**: Confirmation dialog with direct dashboard access button
- **Navigation**: Clickable progress indicators allow step navigation, back button for previous steps

### Recent Changes (November 2025)
- **Removed authentication**: Converted Step 3 from user sign-up to business onboarding form
  - Eliminated email/password fields and terms acceptance checkbox
  - Simplified user experience to focus on competitive analysis needs
- **Added competitor tracking**: Multi-entry field allowing users to specify competitors to monitor
  - Tag-based UI with add/remove functionality
  - Completely optional - can be skipped for AI-selected competitors
- **Updated database schema**: 
  - Removed: email, password fields from users table
  - Added: competitors array field to users table
- **Modified storage interface**: Removed getUserByEmail method, simplified user creation
- **Updated API responses**: Registration endpoint returns business information instead of credentials
- **Implemented Events Monitoring MVP** (November 6, 2025):
  - First live competitive analysis feature in the dashboard
  - 7 service modules: industryMap, channelSuggest, linkDiscover, eventExtract, dedupe, mockPickCompetitors, eventStorage
  - 4 API endpoints: POST /api/channels/suggest, POST /api/events/discover, POST /api/events/crawl, GET /api/events/summary
  - Dashboard integration with service tabs and localStorage-based onboarding data persistence
  - Auto-discovery of competitor events across multiple channel types (공식사이트, 이벤트 페이지, 뉴스 등)
  - Real-time data display with summary badges (모니터링 채널, 발견된 링크, 신규 이벤트, 종료 임박)
  - Two data tables: "신규 이벤트 (30일 이내)" and "종료 임박 이벤트 (7일 이내)"
  - Automated end-to-end test validates complete flow from onboarding to dashboard data display

### Events Monitoring Feature (First Live Module)
- **Architecture**: Service-oriented design with modular components for industry detection, channel discovery, link extraction, and event parsing
- **Industry Mapping**: Automatic industry detection from product/service keywords with customized channel paths per industry
- **Channel Discovery**: Intelligent suggestion of monitoring channels based on industry and competitor analysis
- **Link Discovery**: Automated discovery of event-related links from channel pages with pagination support
- **Event Extraction**: Mock implementation extracting event details (title, dates, status) with 30-day lookback period
- **Deduplication**: URL and content-based deduplication to prevent duplicate event entries
- **Mock Competitor Selection**: AI-powered fallback for users who skip competitor input
- **Storage**: In-memory EventStorage with per-company data isolation and summary generation
- **UI Components**: EventsMonitoring component with badges, loading skeletons, and responsive tables
- **Data Flow**: localStorage → dashboard → auto-init mutations → channel discovery → event crawl → summary display

### Development and Deployment
- **Build System**: Vite for frontend bundling with esbuild for server-side compilation
- **Environment**: Replit-optimized with development banner and cartographer integration
- **Type Safety**: Comprehensive TypeScript configuration with strict mode and path aliases for clean imports
- **Testing**: Playwright-based end-to-end testing for onboarding and dashboard flows