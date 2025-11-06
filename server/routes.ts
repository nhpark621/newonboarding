import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, serviceRecommendationSchema, insertOnboardingSessionSchema } from "@shared/schema";
import OpenAI from "openai";
import { suggestChannels, createChannelsFromSuggestions } from "./services/channelSuggest";
import { discoverLinks } from "./services/linkDiscover";
import { extractEvents } from "./services/eventExtract";
import { deduplicateEvents } from "./services/dedupe";
import { eventStorage } from "./services/eventStorage";
import { mockPickCompetitors } from "./services/mockPickCompetitors";

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

  // Events Monitoring Endpoints
  
  // POST /api/channels/suggest - Suggest channels for competitors
  app.post("/api/channels/suggest", async (req, res) => {
    try {
      const { productOrService, competitors, companyId } = req.body;
      
      if (!productOrService || !companyId) {
        return res.status(400).json({ message: "제품/서비스와 회사 ID가 필요합니다." });
      }
      
      // Use mock competitors if none provided
      const finalCompetitors = competitors && competitors.length > 0 
        ? competitors 
        : mockPickCompetitors(productOrService);
      
      const suggestions = await suggestChannels(productOrService, finalCompetitors);
      const channels = createChannelsFromSuggestions(suggestions);
      
      // Store channels
      eventStorage.storeChannels(companyId, channels);
      
      res.json({ 
        channels,
        competitorsUsed: finalCompetitors
      });
    } catch (error) {
      console.error("Channel suggestion error:", error);
      res.status(500).json({ message: "채널 추천 중 오류가 발생했습니다." });
    }
  });
  
  // POST /api/events/discover - Discover event links from channels
  app.post("/api/events/discover", async (req, res) => {
    try {
      const { companyId, limitPages = 2 } = req.body;
      
      if (!companyId) {
        return res.status(400).json({ message: "회사 ID가 필요합니다." });
      }
      
      const channels = eventStorage.getChannels(companyId);
      
      if (channels.length === 0) {
        return res.status(404).json({ message: "채널을 먼저 생성해주세요." });
      }
      
      const links = await discoverLinks(channels, limitPages);
      
      res.json({ 
        links,
        totalLinks: links.length
      });
    } catch (error) {
      console.error("Link discovery error:", error);
      res.status(500).json({ message: "링크 발견 중 오류가 발생했습니다." });
    }
  });
  
  // POST /api/events/crawl - Crawl and extract events (default: last 30 days)
  app.post("/api/events/crawl", async (req, res) => {
    try {
      const { companyId, limitDays = 30, limitPages = 2 } = req.body;
      
      if (!companyId) {
        return res.status(400).json({ message: "회사 ID가 필요합니다." });
      }
      
      const channels = eventStorage.getChannels(companyId);
      
      if (channels.length === 0) {
        return res.status(404).json({ message: "채널을 먼저 생성해주세요." });
      }
      
      // Discover links
      const links = await discoverLinks(channels, limitPages);
      
      // Extract events
      let events = await extractEvents(links, limitDays);
      
      // Deduplicate
      events = deduplicateEvents(events);
      
      // Store events
      eventStorage.storeEvents(companyId, events);
      
      res.json({ 
        events,
        totalEvents: events.length
      });
    } catch (error) {
      console.error("Event crawl error:", error);
      res.status(500).json({ message: "이벤트 크롤링 중 오류가 발생했습니다." });
    }
  });
  
  // GET /api/events/summary - Get events summary for a company
  app.get("/api/events/summary", async (req, res) => {
    try {
      const { companyId } = req.query;
      
      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ message: "회사 ID가 필요합니다." });
      }
      
      const summary = eventStorage.getSummary(companyId);
      
      res.json(summary);
    } catch (error) {
      console.error("Events summary error:", error);
      res.status(500).json({ message: "이벤트 요약 조회 중 오류가 발생했습니다." });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
