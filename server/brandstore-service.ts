import { URL } from "url";

export interface DomainCandidate {
  url: string;
  isValid: boolean;
  platform?: string;
}

export interface EventRoute {
  path: string;
  score: number;
  matchType: string;
}

export interface BrandStoreCandidate {
  competitor: string;
  baseUrl: string;
  platform: string;
  eventPaths: string[];
  score: number;
}

// Generate domain candidates for a competitor name
export function generateDomainCandidates(competitorName: string): string[] {
  const sanitized = competitorName
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, "")
    .replace(/주식회사|유한회사|corp|inc|ltd/g, "");
  
  const candidates: string[] = [];
  
  // Base domains
  candidates.push(`https://${sanitized}.com`);
  candidates.push(`https://${sanitized}.co.kr`);
  candidates.push(`https://${sanitized}.kr`);
  
  // Subdomain variations
  candidates.push(`https://store.${sanitized}.com`);
  candidates.push(`https://shop.${sanitized}.com`);
  candidates.push(`https://${sanitized}store.com`);
  candidates.push(`https://${sanitized}shop.com`);
  candidates.push(`https://www.${sanitized}.com`);
  candidates.push(`https://www.${sanitized}.co.kr`);
  
  return candidates;
}

// Mock function to pick default competitors based on product
export function mockPickCompetitors(productOrService: string): string[] {
  const product = productOrService.toLowerCase();
  
  if (product.includes("화장품") || product.includes("뷰티") || product.includes("cosmetic")) {
    return ["올리브영", "아리따움", "이니스프리"];
  } else if (product.includes("패션") || product.includes("의류") || product.includes("fashion")) {
    return ["무신사", "지그재그", "에이블리"];
  } else if (product.includes("가전") || product.includes("전자") || product.includes("electronics")) {
    return ["삼성전자", "LG전자", "다이슨"];
  } else if (product.includes("식품") || product.includes("food") || product.includes("음료")) {
    return ["CJ제일제당", "농심", "오뚜기"];
  }
  
  return ["경쟁사A", "경쟁사B", "경쟁사C"];
}

// Probe domain to check if it's valid
export async function probeDomain(url: string): Promise<DomainCandidate> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout
    
    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BrandStoreBot/1.0)"
      }
    });
    
    clearTimeout(timeout);
    
    const isValid = response.ok && 
      response.headers.get("content-type")?.includes("text/html");
    
    return { url, isValid };
  } catch (error) {
    return { url, isValid: false };
  }
}

// Detect e-commerce platform from HTML content
export function detectPlatform(html: string, url: string): string {
  const htmlLower = html.toLowerCase();
  
  // Cafe24
  if (
    htmlLower.includes('meta name="generator" content="cafe24"') ||
    htmlLower.includes('class="xans-') ||
    htmlLower.includes('/board/') ||
    htmlLower.includes('/product/list.html')
  ) {
    return "cafe24";
  }
  
  // Godomall
  if (
    htmlLower.includes('/event/event.html') ||
    htmlLower.includes('/event/event.php') ||
    htmlLower.includes('godosoft') ||
    htmlLower.includes('eclog')
  ) {
    return "godomall";
  }
  
  // MakeShop
  if (
    htmlLower.includes('/shop/') ||
    htmlLower.includes('_makeshop') ||
    htmlLower.includes('makeshop.co.kr')
  ) {
    return "makeshop";
  }
  
  // Shopify
  if (
    htmlLower.includes('cdn.shopify.com') ||
    htmlLower.includes('meta name="shopify-') ||
    htmlLower.includes('shopify.com/s/files')
  ) {
    return "shopify";
  }
  
  // WordPress / WooCommerce
  if (
    htmlLower.includes('meta name="generator" content="wordpress') ||
    htmlLower.includes('woocommerce') ||
    htmlLower.includes('wp-content') ||
    htmlLower.includes('wp-includes')
  ) {
    return "wordpress";
  }
  
  return "generic";
}

// Generate event route candidates based on platform
export function generateEventRoutes(baseUrl: string, platform: string): string[] {
  const routes: string[] = [];
  
  // Generic/common routes
  const genericPaths = [
    "/event", "/events", "/promotion", "/promo", 
    "/benefit", "/campaign", "/sale", "/notice", "/news"
  ];
  
  // Platform-specific routes
  const platformRoutes: Record<string, string[]> = {
    cafe24: [
      "/board/event/list.html",
      "/board/free/list.html",
      "/board/gallery/list.html"
    ],
    godomall: [
      "/event/event.html",
      "/event/event.php"
    ],
    makeshop: [
      "/shop/event.html",
      "/shop/event.php",
      "/shop/shopbrand.html"
    ],
    shopify: [
      "/pages/events",
      "/blogs/events",
      "/collections/sale"
    ],
    wordpress: [
      "/pages/events",
      "/category/event",
      "/category/events",
      "/tag/event",
      "/blog/events"
    ]
  };
  
  // Add generic routes
  genericPaths.forEach(path => {
    try {
      const fullUrl = new URL(path, baseUrl).toString();
      routes.push(fullUrl);
    } catch (e) {
      // Skip invalid URLs
    }
  });
  
  // Add platform-specific routes
  if (platformRoutes[platform]) {
    platformRoutes[platform].forEach(path => {
      try {
        const fullUrl = new URL(path, baseUrl).toString();
        routes.push(fullUrl);
      } catch (e) {
        // Skip invalid URLs
      }
    });
  }
  
  return routes;
}

// Fetch HTML content and extract links
export async function fetchAndExtractLinks(url: string): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BrandStoreBot/1.0)"
      }
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) return [];
    
    const html = await response.text();
    const links: string[] = [];
    
    // Simple regex to extract href attributes
    const hrefRegex = /href=["']([^"']+)["']/gi;
    let match;
    
    while ((match = hrefRegex.exec(html)) !== null) {
      const href = match[1];
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        try {
          const absoluteUrl = new URL(href, url).toString();
          links.push(absoluteUrl);
        } catch (e) {
          // Skip invalid URLs
        }
      }
    }
    
    return links;
  } catch (error) {
    return [];
  }
}

// Score event route candidates
export function scoreEventRoute(url: string, baseUrl: string, competitorName: string): number {
  let score = 0;
  const urlLower = url.toLowerCase();
  const competitorLower = competitorName.toLowerCase();
  
  // Official domain match (+3)
  if (urlLower.startsWith(baseUrl.toLowerCase())) {
    score += 3;
  }
  
  // Event keyword match (+2)
  const eventKeywords = ["event", "promotion", "promo", "benefit", "campaign", "sale"];
  if (eventKeywords.some(keyword => urlLower.includes(keyword))) {
    score += 2;
  }
  
  // Platform-specific path match (+2)
  const platformPaths = [
    "/board/event", "/board/free",
    "/event/event", "/shop/event",
    "/pages/events", "/blogs/events"
  ];
  if (platformPaths.some(path => urlLower.includes(path))) {
    score += 2;
  }
  
  // Competitor name match (+1)
  const sanitizedCompetitor = competitorLower.replace(/[^a-z0-9가-힣]/g, "");
  if (urlLower.includes(sanitizedCompetitor)) {
    score += 1;
  }
  
  return score;
}

// Discover event routes for a specific domain
export async function discoverEventRoutes(
  baseUrl: string,
  competitorName: string
): Promise<{ routes: string[], platform: string }> {
  try {
    // Fetch homepage to detect platform
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(baseUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BrandStoreBot/1.0)"
      }
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      return { routes: [], platform: "generic" };
    }
    
    const html = await response.text();
    const platform = detectPlatform(html, baseUrl);
    
    // Generate candidate routes based on platform
    const candidateRoutes = generateEventRoutes(baseUrl, platform);
    
    // Extract links from homepage
    const extractedLinks = await fetchAndExtractLinks(baseUrl);
    
    // Filter extracted links for event-related paths
    const eventLinks = extractedLinks.filter(link => {
      const linkLower = link.toLowerCase();
      return (
        linkLower.includes('event') ||
        linkLower.includes('promotion') ||
        linkLower.includes('promo') ||
        linkLower.includes('sale') ||
        linkLower.includes('campaign')
      );
    });
    
    // Combine and deduplicate routes
    const allRoutes = [...new Set([...candidateRoutes, ...eventLinks])];
    
    // Score and sort routes
    const scoredRoutes = allRoutes
      .map(route => ({
        route,
        score: scoreEventRoute(route, baseUrl, competitorName)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10) // Take top 10
      .map(item => item.route);
    
    return {
      routes: scoredRoutes,
      platform
    };
  } catch (error) {
    console.error(`Error discovering routes for ${baseUrl}:`, error);
    return { routes: [], platform: "generic" };
  }
}
