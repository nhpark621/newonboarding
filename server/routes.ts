import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, serviceRecommendationSchema, insertOnboardingSessionSchema } from "@shared/schema";
import OpenAI from "openai";
import { generateDomainCandidates, probeDomain, discoverEventRoutes, mockPickCompetitors, scoreEventRoute } from "./brandstore-service";
import { z } from "zod";

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
      const user = await storage.createUser(userData);
      res.json({ 
        id: user.id, 
        company: user.company, 
        team: user.team,
        product: user.product,
        competitors: user.competitors
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "정보 저장 중 오류가 발생했습니다." });
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

  // Brand store discovery endpoint
  app.post("/api/brandstore/discover", async (req, res) => {
    try {
      const schema = z.object({
        competitors: z.array(z.string()),
        productOrService: z.string().optional(),
      });
      
      const { competitors, productOrService } = schema.parse(req.body);
      
      // Use mock competitors if none provided
      const effectiveCompetitors = competitors.length > 0 
        ? competitors 
        : mockPickCompetitors(productOrService || "");
      
      const candidates = [];
      
      // Process each competitor
      for (const competitor of effectiveCompetitors) {
        const domainCandidates = generateDomainCandidates(competitor);
        
        // Probe domains to find valid ones (limit to first 3 valid)
        const validDomains = [];
        for (const domain of domainCandidates) {
          const result = await probeDomain(domain);
          if (result.isValid) {
            validDomains.push(domain);
            if (validDomains.length >= 3) break; // Limit to 3 per competitor
          }
        }
        
        // For each valid domain, discover event routes
        for (const baseUrl of validDomains) {
          const { routes, platform } = await discoverEventRoutes(baseUrl, competitor);
          
          if (routes.length > 0) {
            // Calculate overall score for this candidate
            const avgScore = routes.reduce((sum, route) => 
              sum + scoreEventRoute(route, baseUrl, competitor), 0
            ) / routes.length;
            
            candidates.push({
              competitor,
              baseUrl,
              platform,
              eventPaths: routes.slice(0, 5), // Top 5 routes
              score: Math.round(avgScore * 10) / 10
            });
          }
        }
      }
      
      // Sort by score descending
      candidates.sort((a, b) => b.score - a.score);
      
      res.json({ candidates });
    } catch (error) {
      console.error("Brand store discovery error:", error);
      res.status(500).json({ 
        message: "브랜드 스토어 탐색 중 오류가 발생했습니다.",
        candidates: []
      });
    }
  });

  // Brand store approval endpoint
  app.post("/api/brandstore/approve", async (req, res) => {
    try {
      const schema = z.object({
        selections: z.array(z.object({
          competitor: z.string(),
          baseUrl: z.string(),
          platform: z.string().optional(),
          eventPaths: z.array(z.string()),
        })),
      });
      
      const { selections } = schema.parse(req.body);
      
      const channels = [];
      const eventPages = [];
      
      for (const selection of selections) {
        // Create channel
        const channel = await storage.createChannel({
          type: "brand_store",
          competitorId: selection.competitor,
          name: `${selection.competitor} 브랜드 스토어`,
          baseUrl: selection.baseUrl,
          platform: selection.platform || "generic",
        });
        
        channels.push(channel);
        
        // Create event pages for this channel
        for (const eventPath of selection.eventPaths) {
          const eventPage = await storage.createEventPage({
            channelId: channel.id,
            url: eventPath,
            status: "new",
          });
          
          eventPages.push(eventPage);
        }
      }
      
      res.json({ channels, eventPages });
    } catch (error) {
      console.error("Brand store approval error:", error);
      res.status(500).json({ 
        message: "선택 항목 저장 중 오류가 발생했습니다."
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
