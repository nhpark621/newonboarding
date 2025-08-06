// This file contains OpenAI utility functions for the frontend
// Note: The actual OpenAI API calls are handled on the server side for security

export interface ServiceRecommendationRequest {
  userInput: string;
}

export interface ServiceRecommendationResponse {
  recommended_services: string[];
}

// Available services that can be recommended
export const AVAILABLE_SERVICES = [
  "뉴스·보도자료 분석",
  "신제품·서비스 출시",
  "인재 영입",
  "광고 분석",
  "SNS 콘텐츠",
  "이벤트 모니터링"
] as const;

export type ServiceType = typeof AVAILABLE_SERVICES[number];
