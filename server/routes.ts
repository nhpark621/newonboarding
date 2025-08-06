import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, serviceRecommendationSchema, insertOnboardingSessionSchema } from "@shared/schema";
import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Service recommendation endpoint
  app.post("/api/recommend-services", async (req, res) => {
    try {
      const { userInput } = serviceRecommendationSchema.parse(req.body);
      
      const prompt = `
사용자가 다음과 같은 고민을 입력했습니다:
"${userInput}"

이 고민과 관련해 추천할 만한 경쟁사 분석 서비스 항목 3~4가지를 다음 6가지 중에서만 선별해 주세요:
- 뉴스·보도자료 분석
- 신제품·서비스 출시  
- 인재 영입
- 광고 분석
- SNS 콘텐츠
- 이벤트 모니터링

JSON 형태로 응답해주세요: { "recommended_services": ["서비스1", "서비스2", "서비스3"] }
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "당신은 B2B 경쟁사 분석 전문가입니다. 사용자의 니즈를 분석하여 가장 적합한 분석 서비스를 추천합니다."
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 200,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      // Fallback if parsing fails
      if (!result.recommended_services) {
        result.recommended_services = ["뉴스·보도자료 분석", "신제품·서비스 출시", "광고 분석"];
      }

      res.json(result);
    } catch (error) {
      console.error("Service recommendation error:", error);
      // Return default recommendations on error
      res.json({
        recommended_services: ["뉴스·보도자료 분석", "신제품·서비스 출시", "광고 분석"]
      });
    }
  });

  // User registration endpoint
  app.post("/api/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "이미 등록된 이메일입니다." });
      }

      const user = await storage.createUser(userData);
      res.json({ id: user.id, email: user.email });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "회원가입 중 오류가 발생했습니다." });
    }
  });

  // Onboarding session endpoint
  app.post("/api/onboarding-session", async (req, res) => {
    try {
      const sessionData = insertOnboardingSessionSchema.parse(req.body);
      const session = await storage.createOnboardingSession(sessionData);
      res.json(session);
    } catch (error) {
      console.error("Onboarding session error:", error);
      res.status(400).json({ message: "온보딩 세션 저장 중 오류가 발생했습니다." });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
