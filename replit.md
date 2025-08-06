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
  - Users table with authentication credentials and company information
  - Onboarding sessions table linking user concerns to selected services via JSON fields
- **Development Storage**: In-memory storage implementation for rapid prototyping and testing
- **Migration System**: Drizzle Kit for database schema migrations and management

### Authentication and Authorization
- **Simple Authentication**: Basic email/password registration without complex session management
- **Form Validation**: Zod schema validation for type-safe form processing with specific business rules (8+ character passwords with letters and numbers)
- **Data Collection**: Minimal required fields (email, company, team) with optional product specification

### External Service Integrations
- **AI Recommendations**: OpenAI GPT-4o integration for analyzing user input and recommending relevant competitive analysis services
- **Service Mapping**: Predefined service categories (news analysis, product launches, HR recruitment, advertising, social media, events) mapped to user concerns
- **Analytics Tracking**: Event tracking system prepared for GA4 or custom analytics integration

### Multi-Step Onboarding Flow
- **Step 1**: Concern input with predefined tags and auto-completion for faster user engagement
- **Step 2**: AI-powered service recommendation with interactive card selection and hover previews
- **Step 3**: Registration form with company details and terms acceptance, followed by success confirmation

### Development and Deployment
- **Build System**: Vite for frontend bundling with esbuild for server-side compilation
- **Environment**: Replit-optimized with development banner and cartographer integration
- **Type Safety**: Comprehensive TypeScript configuration with strict mode and path aliases for clean imports