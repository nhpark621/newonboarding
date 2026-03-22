import OpenAI from "openai";
import { generateDomainCandidates, probeDomain, generateEventRoutes, detectPlatform } from "./brandstore-service";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key",
});

export interface DiscoveredEvent {
  competitorName: string;
  source: "official" | "naver";
  sourceUrl: string;
  eventType: string;
  title: string;
  description: string;
  startDate: string | null;
  endDate: string | null;
  benefits: string[];
  imageUrl: string | null;
}

// Fetch page HTML
async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

// Download image and convert to base64 data URL
async function imageToBase64(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    clearTimeout(timeout);
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) return null;

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

// Extract text content from HTML (remove tags, scripts, styles)
function extractTextContent(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

  // Limit text length
  return text.slice(0, 3000);
}

// Extract main images from HTML
function extractEventImages(html: string, baseUrl: string): string[] {
  const images: string[] = [];
  const seen = new Set<string>();

  // Find images, prioritizing larger/main content images
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[1];
    const fullTag = match[0].toLowerCase();

    // Skip tiny icons, logos, tracking pixels
    if (
      fullTag.includes('width="1"') ||
      fullTag.includes("icon") ||
      fullTag.includes("logo") ||
      fullTag.includes("pixel") ||
      fullTag.includes("tracker") ||
      src.includes("spacer") ||
      src.includes(".gif") ||
      src.endsWith(".svg")
    ) {
      continue;
    }

    try {
      const absoluteUrl = src.startsWith("http") ? src : new URL(src, baseUrl).toString();
      if (!seen.has(absoluteUrl)) {
        seen.add(absoluteUrl);
        images.push(absoluteUrl);
      }
    } catch {
      // skip invalid URLs
    }
  }

  // Return top 3 most relevant images (first ones in main content tend to be event banners)
  return images.slice(0, 3);
}

// Use GPT-4o Vision to analyze event page content
async function analyzeEventWithGPT(
  textContent: string,
  imageBase64List: string[],
  sourceUrl: string
): Promise<{
  eventType: string;
  title: string;
  description: string;
  startDate: string | null;
  endDate: string | null;
  benefits: string[];
} | null> {
  try {
    const contentParts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];

    // Add text instruction
    contentParts.push({
      type: "text",
      text: `다음은 경쟁사의 이벤트/프로모션 페이지에서 추출한 정보입니다. 이 정보를 분석하여 구조화된 이벤트 정보를 추출해주세요.

페이지 URL: ${sourceUrl}

페이지 텍스트 내용:
${textContent || "(텍스트 없음 - 이미지를 분석해주세요)"}

아래 이미지가 있다면 OCR로 텍스트를 읽고 이벤트 정보를 추출해주세요.

JSON 형태로 응답해주세요:
{
  "eventType": "이벤트 유형 (할인/세일, 사은품 증정, 1+1/번들, 포인트/적립, 신규가입 혜택, 시즌 프로모션, 한정판/특별판, 체험/샘플, 무료배송, 기타 중 하나)",
  "title": "이벤트 제목",
  "description": "이벤트 내용 요약 (2-3문장)",
  "startDate": "시작일 (YYYY-MM-DD 형식, 없으면 null)",
  "endDate": "종료일 (YYYY-MM-DD 형식, 없으면 null)",
  "benefits": ["혜택1", "혜택2"]
}

만약 이벤트/프로모션 정보가 아니라면 null을 반환해주세요.`,
    });

    // Add images for vision analysis
    for (const base64 of imageBase64List) {
      contentParts.push({
        type: "image_url",
        image_url: { url: base64, detail: "low" },
      });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "당신은 한국 e커머스 이벤트/프로모션 분석 전문가입니다. 웹페이지의 텍스트와 이미지를 분석하여 이벤트 정보를 정확하게 추출합니다. 이미지에 텍스트가 있으면 OCR로 읽어서 분석합니다.",
        },
        {
          role: "user",
          content: contentParts,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const result = JSON.parse(response.choices[0].message.content || "null");
    if (!result || !result.title) return null;

    return {
      eventType: result.eventType || "기타",
      title: result.title,
      description: result.description || "",
      startDate: result.startDate || null,
      endDate: result.endDate || null,
      benefits: result.benefits || [],
    };
  } catch (error) {
    console.error("GPT event analysis error:", error);
    return null;
  }
}

// Generate Naver brand store event URLs
function generateNaverEventUrls(competitorName: string): string[] {
  const sanitized = competitorName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const encodedName = encodeURIComponent(competitorName);

  return [
    `https://brand.naver.com/${sanitized}`,
    `https://brand.naver.com/${sanitized}/category/event`,
    `https://brand.naver.com/${sanitized}/events`,
    `https://search.shopping.naver.com/search/all?query=${encodedName}+이벤트`,
  ];
}

// Find event pages on a website
async function findEventPages(
  baseUrl: string,
  platform: string,
  limit: number = 5
): Promise<string[]> {
  const candidateRoutes = generateEventRoutes(baseUrl, platform);
  const validPages: string[] = [];

  for (const route of candidateRoutes) {
    if (validPages.length >= limit) break;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(route, {
        method: "HEAD",
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      clearTimeout(timeout);
      if (response.ok) {
        validPages.push(route);
      }
    } catch {
      // skip
    }
  }

  return validPages;
}

// Process a single event page: fetch, extract, analyze with GPT
async function processEventPage(
  url: string,
  competitorName: string,
  source: "official" | "naver"
): Promise<DiscoveredEvent | null> {
  const html = await fetchPage(url);
  if (!html) return null;

  // Extract text content
  const textContent = extractTextContent(html);

  // Check if this looks like an event page
  const eventKeywords = ["이벤트", "프로모션", "할인", "세일", "혜택", "쿠폰", "사은품", "증정", "무료배송", "특가", "기간"];
  const hasEventContent = eventKeywords.some((kw) => textContent.includes(kw));

  if (!hasEventContent && textContent.length < 100) return null;

  // Extract images for OCR analysis
  const imageUrls = extractEventImages(html, url);

  // Download images and convert to base64
  const imageBase64List: string[] = [];
  for (const imgUrl of imageUrls.slice(0, 2)) {
    const base64 = await imageToBase64(imgUrl);
    if (base64) {
      imageBase64List.push(base64);
    }
  }

  // Analyze with GPT-4o Vision
  const analysis = await analyzeEventWithGPT(textContent, imageBase64List, url);
  if (!analysis) return null;

  return {
    competitorName,
    source,
    sourceUrl: url,
    eventType: analysis.eventType,
    title: analysis.title,
    description: analysis.description,
    startDate: analysis.startDate,
    endDate: analysis.endDate,
    benefits: analysis.benefits,
    imageUrl: imageUrls[0] || null,
  };
}

// Main function: discover events for a competitor
export async function discoverCompetitorEvents(
  competitorName: string
): Promise<DiscoveredEvent[]> {
  const events: DiscoveredEvent[] = [];

  // 1. Find official site
  const domainCandidates = generateDomainCandidates(competitorName);
  let officialBaseUrl = "";
  for (const domain of domainCandidates) {
    const result = await probeDomain(domain);
    if (result.isValid) {
      officialBaseUrl = domain;
      break;
    }
  }

  // 2. Discover event pages on official site
  if (officialBaseUrl) {
    let platform = "generic";
    const html = await fetchPage(officialBaseUrl);
    if (html) {
      platform = detectPlatform(html, officialBaseUrl);
    }

    const eventPages = await findEventPages(officialBaseUrl, platform, 5);

    for (const pageUrl of eventPages) {
      const event = await processEventPage(pageUrl, competitorName, "official");
      if (event) {
        events.push(event);
      }
    }
  }

  // 3. Discover events on Naver brand store
  const naverUrls = generateNaverEventUrls(competitorName);
  for (const naverUrl of naverUrls) {
    if (events.filter((e) => e.source === "naver").length >= 3) break;

    const event = await processEventPage(naverUrl, competitorName, "naver");
    if (event) {
      events.push(event);
    }
  }

  return events;
}

// Discover events for multiple competitors
export async function discoverAllCompetitorEvents(
  competitors: string[]
): Promise<DiscoveredEvent[]> {
  const allEvents: DiscoveredEvent[] = [];
  for (const competitor of competitors) {
    const events = await discoverCompetitorEvents(competitor);
    allEvents.push(...events);
  }
  return allEvents;
}
