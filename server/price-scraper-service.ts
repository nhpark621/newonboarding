import { generateDomainCandidates, probeDomain } from "./brandstore-service.js";

export interface DomainPrice {
  domain: "official" | "naver" | "coupang";
  label: string;
  price: string | null;
  productUrl: string;
  fetchedAt: string;
}

export interface ProductPriceResult {
  competitorName: string;
  productName: string;
  prices: DomainPrice[];
}

// Generate URLs for 3 domains
export function generateDomainUrls(
  competitorName: string,
  productName: string,
  officialBaseUrl?: string
): { official: string; naver: string; coupang: string } {
  // Official: use discovered base URL or generate
  const official = officialBaseUrl || "";

  // Naver Brand Store: use brand.naver.com/{slug} pattern
  // Also try shopping search as fallback
  const sanitized = competitorName
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, "");
  const encodedQuery = encodeURIComponent(`${competitorName} ${productName}`);
  const naver = `https://search.shopping.naver.com/search/all?query=${encodedQuery}`;

  // Coupang: search URL
  const coupangQuery = encodeURIComponent(`${competitorName} ${productName}`);
  const coupang = `https://www.coupang.com/np/search?q=${coupangQuery}`;

  return { official, naver, coupang };
}

// Extract price from HTML using various patterns
function extractPriceFromHtml(html: string): string | null {
  // Strategy 1: JSON-LD structured data
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let jsonLdMatch;
  while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(jsonLdMatch[1]);
      const price = data?.offers?.price || data?.offers?.lowPrice;
      if (price) {
        return `${Number(price).toLocaleString()}원`;
      }
    } catch {
      // skip
    }
  }

  // Strategy 2: Common price class patterns
  const priceClassPatterns = [
    /class="[^"]*(?:sale[_-]?price|sell[_-]?price|final[_-]?price|current[_-]?price|price[_-]?sale)[^"]*"[^>]*>[\s]*[₩]?\s*([\d,]+)/i,
    /class="[^"]*price[^"]*"[^>]*>[\s]*[₩]?\s*([\d,]+)/i,
    /class="[^"]*total[_-]?price[^"]*"[^>]*>[\s]*[₩]?\s*([\d,]+)/i,
  ];

  for (const pattern of priceClassPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const num = parseInt(match[1].replace(/,/g, ""), 10);
      if (num >= 100 && num < 100000000) {
        return `${num.toLocaleString()}원`;
      }
    }
  }

  // Strategy 3: Price with Korean won symbol/text
  const wonPatterns = [
    /₩\s*([\d,]+)/,
    /([\d]{1,3}(?:,\d{3})+)\s*원/,
  ];

  for (const pattern of wonPatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const num = parseInt(match[1].replace(/,/g, ""), 10);
      if (num >= 100 && num < 100000000) {
        return `${num.toLocaleString()}원`;
      }
    }
  }

  return null;
}

// Extract price from Naver Shopping search results
function extractNaverPrice(html: string, productName: string): string | null {
  // Naver shopping uses specific class patterns
  const pricePatterns = [
    /class="[^"]*price_num[^"]*"[^>]*>([\d,]+)/i,
    /class="[^"]*price[^"]*"[^>]*>[\s]*<[^>]*>([\d,]+)/i,
    /"price":\s*"?([\d,]+)/i,
  ];

  for (const pattern of pricePatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const num = parseInt(match[1].replace(/,/g, ""), 10);
      if (num >= 100 && num < 100000000) {
        return `${num.toLocaleString()}원`;
      }
    }
  }

  return extractPriceFromHtml(html);
}

// Extract price from Coupang search results
function extractCoupangPrice(html: string, productName: string): string | null {
  const pricePatterns = [
    /class="[^"]*price-value[^"]*"[^>]*>([\d,]+)/i,
    /class="[^"]*sale-price[^"]*"[^>]*>([\d,]+)/i,
    /"salePrice":\s*"?([\d,]+)/i,
  ];

  for (const pattern of pricePatterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const num = parseInt(match[1].replace(/,/g, ""), 10);
      if (num >= 100 && num < 100000000) {
        return `${num.toLocaleString()}원`;
      }
    }
  }

  return extractPriceFromHtml(html);
}

// Fetch page with proper headers
async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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

// Scrape price from a specific domain
async function scrapeDomainPrice(
  url: string,
  domainType: "official" | "naver" | "coupang",
  productName: string
): Promise<string | null> {
  const html = await fetchPage(url);
  if (!html) return null;

  switch (domainType) {
    case "official":
      return extractPriceFromHtml(html);
    case "naver":
      return extractNaverPrice(html, productName);
    case "coupang":
      return extractCoupangPrice(html, productName);
    default:
      return null;
  }
}

// Find official product URL by searching on the official site
async function findOfficialProductUrl(
  baseUrl: string,
  productName: string
): Promise<string> {
  if (!baseUrl) return "";

  // Try common product search patterns
  const searchPaths = [
    `/search?q=${encodeURIComponent(productName)}`,
    `/product/search?keyword=${encodeURIComponent(productName)}`,
    `/goods/search?keyword=${encodeURIComponent(productName)}`,
  ];

  for (const path of searchPaths) {
    try {
      const url = new URL(path, baseUrl).toString();
      const html = await fetchPage(url);
      if (html && html.length > 1000) {
        return url;
      }
    } catch {
      // continue
    }
  }

  return baseUrl;
}

// Main function: fetch prices for a product from all 3 domains
export async function fetchProductPrices(
  competitorName: string,
  productName: string,
  officialBaseUrl?: string
): Promise<ProductPriceResult> {
  const urls = generateDomainUrls(competitorName, productName, officialBaseUrl);
  const now = new Date().toISOString();

  // Find official product URL
  const officialUrl = officialBaseUrl
    ? await findOfficialProductUrl(officialBaseUrl, productName)
    : "";

  // Fetch prices from all 3 domains in parallel
  const [officialPrice, naverPrice, coupangPrice] = await Promise.all([
    officialUrl ? scrapeDomainPrice(officialUrl, "official", productName) : Promise.resolve(null),
    scrapeDomainPrice(urls.naver, "naver", productName),
    scrapeDomainPrice(urls.coupang, "coupang", productName),
  ]);

  return {
    competitorName,
    productName,
    prices: [
      {
        domain: "official",
        label: "공식 홈페이지",
        price: officialPrice,
        productUrl: officialUrl || officialBaseUrl || "",
        fetchedAt: now,
      },
      {
        domain: "naver",
        label: "네이버 쇼핑",
        price: naverPrice,
        productUrl: urls.naver,
        fetchedAt: now,
      },
      {
        domain: "coupang",
        label: "쿠팡",
        price: coupangPrice,
        productUrl: urls.coupang,
        fetchedAt: now,
      },
    ],
  };
}

// Fetch prices for multiple products
export async function fetchAllProductPrices(
  products: Array<{
    competitorName: string;
    productName: string;
    officialBaseUrl?: string;
  }>
): Promise<ProductPriceResult[]> {
  // Process sequentially to avoid rate limiting
  const results: ProductPriceResult[] = [];
  for (const product of products) {
    const result = await fetchProductPrices(
      product.competitorName,
      product.productName,
      product.officialBaseUrl
    );
    results.push(result);
  }
  return results;
}
