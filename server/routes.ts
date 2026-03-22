import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { insertUserSchema, serviceRecommendationSchema, insertOnboardingSessionSchema } from "../shared/schema.js";
import OpenAI from "openai";
import { generateDomainCandidates, probeDomain, discoverEventRoutes, mockPickCompetitors, scoreEventRoute } from "./brandstore-service.js";
import { discoverProducts } from "./price-monitor-service.js";
import { fetchAllProductPrices } from "./price-scraper-service.js";
import { discoverCompetitorEvents } from "./event-monitor-service.js";
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

이 고민과 관련해 추천할 만한 경쟁사 분석 서비스 항목 3~4가지를 다음 7가지 중에서만 선별해 주세요:
- 뉴스·보도자료 분석
- 신제품·서비스 출시
- 인재 영입
- 광고 분석
- SNS 콘텐츠
- 이벤트 모니터링
- 경쟁사 제품 가격 모니터링

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

  // Competitor recommendation endpoint
  app.post("/api/recommend-competitors", async (req, res) => {
    try {
      const schema = z.object({
        company: z.string().min(1),
        team: z.string().min(1),
        product: z.string().min(1),
      });
      const { company, team, product } = schema.parse(req.body);

      const prompt = `
다음은 한 기업의 정보입니다:
- 회사명: "${company}"
- 소속 팀: "${team}"
- 담당 제품/서비스: "${product}"

이 기업이 모니터링해야 할 주요 경쟁사를 3~5개 추천해주세요.
같은 산업/시장에서 직접적으로 경쟁하는 실제 기업명을 추천해주세요.

JSON 형태로 응답해주세요: { "recommended_competitors": ["경쟁사1", "경쟁사2", "경쟁사3"] }
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "당신은 B2B 경쟁사 분석 전문가입니다. 기업 정보를 바탕으로 해당 시장의 주요 경쟁사를 추천합니다. 실제 존재하는 기업명만 추천하세요."
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 300,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");

      if (!result.recommended_competitors || !Array.isArray(result.recommended_competitors)) {
        result.recommended_competitors = [];
      }

      res.json(result);
    } catch (error: any) {
      console.error("Competitor recommendation error:", error);
      res.json({
        recommended_competitors: [],
        debug_error: error?.message || "Unknown error",
        debug_api_key_set: !!(process.env.OPENAI_API_KEY),
      });
    }
  });

  // Debug: test Naver access from this server
  app.get("/api/debug/naver-test", async (_req, res) => {
    try {
      const testUrl = "https://search.naver.com/search.naver?query=" + encodeURIComponent("네스프레소 브랜드스토어");
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(testUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "ko-KR,ko;q=0.9",
        },
      });
      clearTimeout(timeout);
      const html = await response.text();
      const brandMatches = html.match(/brand\.naver\.com\/[a-zA-Z0-9_-]+/g) || [];
      res.json({
        status: response.status,
        htmlLength: html.length,
        brandStoreUrls: Array.from(new Set(brandMatches)).slice(0, 5),
        containsBrandStore: brandMatches.length > 0,
        snippet: html.slice(0, 500),
      });
    } catch (error: any) {
      res.json({ error: error?.message });
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

  // Price monitor: discover products from competitor website
  app.post("/api/price-monitor/discover-products", async (req, res) => {
    try {
      const schema = z.object({
        competitorName: z.string().min(1),
      });
      const { competitorName } = schema.parse(req.body);
      const result = await discoverProducts(competitorName);
      res.json(result);
    } catch (error) {
      console.error("Product discovery error:", error);
      res.status(500).json({
        products: [],
        baseUrl: "",
        platform: "unknown",
        message: "제품 탐색 중 오류가 발생했습니다.",
      });
    }
  });

  // Debug: step-by-step product discovery
  app.post("/api/debug/discover-steps", async (req, res) => {
    const { competitorName } = req.body;
    const debug: any = { steps: [] };
    try {
      // Step 1: Search Naver
      const searchUrl = `https://search.naver.com/search.naver?query=${encodeURIComponent(competitorName + " 브랜드스토어")}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const searchRes = await fetch(searchUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept-Language": "ko-KR,ko;q=0.9",
        },
      });
      clearTimeout(timeout);
      const searchHtml = await searchRes.text();
      const brandMatches = searchHtml.match(/(?:https?:)?\/?\/?(?:brand|smartstore)\.naver\.com\/([a-zA-Z][a-zA-Z0-9_-]{1,30})/g) || [];
      debug.steps.push({ step: "1_naver_search", status: searchRes.status, htmlLen: searchHtml.length, brandMatches });

      // Step 2: Find slug
      const slugRegex = /(?:brand|smartstore)\.naver\.com\/([a-zA-Z][a-zA-Z0-9_-]{1,30})/;
      const slugMatch = brandMatches.find(m => {
        const s = m.match(slugRegex);
        return s && !["search","gate","login","help","category","best"].includes(s[1]);
      });
      const slug = slugMatch?.match(slugRegex)?.[1] || "";
      const brandStoreUrl = slug ? `https://brand.naver.com/${slug}` : "";
      debug.steps.push({ step: "2_slug_found", slug, brandStoreUrl });

      // Step 3: Fetch brand store
      if (brandStoreUrl) {
        const ctrl2 = new AbortController();
        const t2 = setTimeout(() => ctrl2.abort(), 10000);
        const storeRes = await fetch(brandStoreUrl, {
          signal: ctrl2.signal,
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Accept-Language": "ko-KR,ko;q=0.9" },
        });
        clearTimeout(t2);
        const storeHtml = await storeRes.text();
        const hasNextData = storeHtml.includes("__NEXT_DATA__");
        const productNameMatches = storeHtml.match(/"productName"\s*:\s*"[^"]+"/g)?.slice(0, 5) || [];
        const nameMatches = storeHtml.match(/"name"\s*:\s*"[^"]{2,50}"/g)?.slice(0, 5) || [];
        debug.steps.push({ step: "3_brand_store", status: storeRes.status, htmlLen: storeHtml.length, hasNextData, productNameMatches, nameMatches });
      }

      res.json(debug);
    } catch (error: any) {
      debug.error = error?.message;
      res.json(debug);
    }
  });

  // Price monitor: save selected products for monitoring
  app.post("/api/price-monitor/save-selections", async (req, res) => {
    try {
      const schema = z.object({
        products: z.array(z.object({
          competitorName: z.string(),
          productName: z.string(),
          productUrl: z.string(),
          currentPrice: z.string().optional(),
          imageUrl: z.string().optional(),
        })),
      });
      const { products } = schema.parse(req.body);

      const saved = [];
      for (const product of products) {
        const monitored = await storage.createMonitoredProduct({
          competitorName: product.competitorName,
          productName: product.productName,
          productUrl: product.productUrl,
          currentPrice: product.currentPrice,
          imageUrl: product.imageUrl,
        });
        saved.push(monitored);
      }

      res.json({ products: saved });
    } catch (error) {
      console.error("Product save error:", error);
      res.status(500).json({ message: "제품 저장 중 오류가 발생했습니다." });
    }
  });

  // Event monitor: discover events for a competitor
  app.post("/api/event-monitor/discover", async (req, res) => {
    try {
      const schema = z.object({
        competitorName: z.string().min(1),
      });
      const { competitorName } = schema.parse(req.body);
      const events = await discoverCompetitorEvents(competitorName);

      // Save discovered events
      const saved = [];
      for (const event of events) {
        const record = await storage.createDiscoveredEvent({
          competitorName: event.competitorName,
          source: event.source,
          sourceUrl: event.sourceUrl,
          eventType: event.eventType,
          title: event.title,
          description: event.description,
          startDate: event.startDate || undefined,
          endDate: event.endDate || undefined,
          benefits: event.benefits,
          imageUrl: event.imageUrl || undefined,
        });
        saved.push(record);
      }

      res.json({ events: saved });
    } catch (error) {
      console.error("Event discovery error:", error);
      res.status(500).json({
        events: [],
        message: "이벤트 탐색 중 오류가 발생했습니다.",
      });
    }
  });

  // Event monitor: get all discovered events
  app.get("/api/event-monitor/events", async (_req, res) => {
    try {
      const events = await storage.getDiscoveredEvents();
      res.json({ events });
    } catch (error) {
      console.error("Get events error:", error);
      res.status(500).json({ events: [] });
    }
  });

  // Price monitor: get saved monitored products
  app.get("/api/price-monitor/products", async (_req, res) => {
    try {
      const products = await storage.getMonitoredProducts();
      res.json({ products });
    } catch (error) {
      console.error("Get monitored products error:", error);
      res.status(500).json({ products: [] });
    }
  });

  // Price monitor: fetch prices from 3 domains for monitored products
  app.post("/api/price-monitor/fetch-prices", async (req, res) => {
    try {
      const schema = z.object({
        products: z.array(z.object({
          id: z.string(),
          competitorName: z.string(),
          productName: z.string(),
          productUrl: z.string().optional(),
        })),
      });
      const { products } = schema.parse(req.body);

      const results = await fetchAllProductPrices(
        products.map(p => ({
          competitorName: p.competitorName,
          productName: p.productName,
          officialBaseUrl: p.productUrl,
        }))
      );

      // Save price records for history
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const result = results[i];
        if (result) {
          for (const domainPrice of result.prices) {
            await storage.createPriceRecord({
              monitoredProductId: product.id,
              domain: domainPrice.domain,
              price: domainPrice.price || undefined,
              productUrl: domainPrice.productUrl,
            });
          }
        }
      }

      res.json({ results });
    } catch (error) {
      console.error("Fetch prices error:", error);
      res.status(500).json({ message: "가격 조회 중 오류가 발생했습니다.", results: [] });
    }
  });

  // Price monitor: get price history for a product
  app.get("/api/price-monitor/history/:productId", async (req, res) => {
    try {
      const records = await storage.getPriceRecordsByProductId(req.params.productId);
      res.json({ records });
    } catch (error) {
      console.error("Price history error:", error);
      res.status(500).json({ records: [] });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
