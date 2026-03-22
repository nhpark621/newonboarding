import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key",
});

export interface DiscoveredProduct {
  name: string;
  price: string;
  url: string;
  imageUrl?: string;
  source?: string;
}

// Fetch with browser-like headers
async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://search.naver.com/",
      },
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

// Strategy 1: Naver Shopping Search API - most reliable for product discovery
async function searchNaverShopping(competitorName: string): Promise<DiscoveredProduct[]> {
  const products: DiscoveredProduct[] = [];
  const seen = new Set<string>();

  // Try Naver Shopping search page (contains embedded data)
  const searchUrl = `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(competitorName)}&origQuery=${encodeURIComponent(competitorName)}&pagingIndex=1&pagingSize=20&sort=rel`;
  const html = await fetchPage(searchUrl);
  if (!html) return products;

  // Extract product data from embedded JSON in the page
  // Naver Shopping embeds product data in script tags
  const patterns = [
    /"productTitle"\s*:\s*"([^"]+)"[\s\S]*?"price"\s*:\s*"?(\d+)"?/g,
    /"name"\s*:\s*"([^"]+)"[\s\S]*?"price"\s*:\s*"?(\d+)"?/g,
    /"productName"\s*:\s*"([^"]+)"[\s\S]*?"salePrice"\s*:\s*"?(\d+)"?/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const name = match[1].replace(/\\u[\dA-Fa-f]{4}/g, (m) =>
        String.fromCharCode(parseInt(m.slice(2), 16))
      ).replace(/<[^>]+>/g, "").trim();
      const price = parseInt(match[2], 10);

      if (name && !seen.has(name) && name.length > 1 && price > 0) {
        seen.add(name);
        products.push({
          name,
          price: `${price.toLocaleString()}원`,
          url: searchUrl,
          source: "naver_shopping",
        });
      }
    }
    if (products.length > 0) break;
  }

  // Fallback: extract from link text patterns
  if (products.length === 0) {
    const titlePriceRegex = /class="[^"]*product[_-]?(?:title|name|link)[^"]*"[^>]*>([^<]{3,80})<[\s\S]*?(\d{1,3}(?:,\d{3})+)/g;
    let match;
    while ((match = titlePriceRegex.exec(html)) !== null) {
      const name = match[1].replace(/<[^>]+>/g, "").trim();
      const price = match[2];
      if (name && !seen.has(name)) {
        seen.add(name);
        products.push({
          name,
          price: `${price}원`,
          url: searchUrl,
          source: "naver_shopping",
        });
      }
    }
  }

  return products.slice(0, 20);
}

// Strategy 2: Find and scrape Naver brand store
async function findNaverBrandStore(competitorName: string): Promise<{ url: string; products: DiscoveredProduct[] }> {
  const products: DiscoveredProduct[] = [];
  const seen = new Set<string>();

  // Search for brand store URL in Naver
  const searchUrl = `https://search.naver.com/search.naver?query=${encodeURIComponent(competitorName + " 브랜드스토어")}`;
  const searchHtml = await fetchPage(searchUrl);

  let brandStoreUrl = "";

  if (searchHtml) {
    // Find brand.naver.com or smartstore.naver.com URL with a valid slug
    const brandRegex = /(?:https?:)?\/?\/?(?:brand|smartstore)\.naver\.com\/([a-zA-Z][a-zA-Z0-9_-]{1,30})/g;
    let match;
    while ((match = brandRegex.exec(searchHtml)) !== null) {
      const slug = match[1];
      // Skip generic/internal paths
      if (["search", "gate", "login", "help", "category", "best"].includes(slug)) continue;
      brandStoreUrl = `https://brand.naver.com/${slug}`;
      break;
    }
  }

  if (!brandStoreUrl) return { url: "", products: [] };

  // Fetch brand store page
  const html = await fetchPage(brandStoreUrl);
  if (!html) return { url: brandStoreUrl, products: [] };

  // Extract from __NEXT_DATA__
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextDataMatch) {
    try {
      const data = JSON.parse(nextDataMatch[1]);
      const findProducts = (obj: any, depth: number): void => {
        if (!obj || typeof obj !== "object" || depth > 8) return;
        if (obj.name && typeof obj.name === "string" && obj.name.length > 1 && obj.name.length < 100) {
          const hasPrice = obj.price || obj.salePrice || obj.discountedPrice || obj.channelProductPrice;
          if (hasPrice) {
            const name = obj.name;
            if (!seen.has(name)) {
              seen.add(name);
              const price = obj.salePrice || obj.discountedPrice || obj.channelProductPrice || obj.price;
              products.push({
                name,
                price: typeof price === "number" ? `${price.toLocaleString()}원` : `${price}원`,
                url: obj.url || obj.productUrl || `${brandStoreUrl}/products/${obj.id || obj.productNo || ""}`,
                imageUrl: obj.imageUrl || obj.image || obj.representImage?.url || obj.thumbnailUrl || undefined,
                source: "naver_brand_store",
              });
            }
          }
        }
        if (Array.isArray(obj)) {
          for (const item of obj) findProducts(item, depth + 1);
        } else {
          for (const val of Object.values(obj)) findProducts(val, depth + 1);
        }
      };
      findProducts(data, 0);
    } catch { /* skip */ }
  }

  // Fallback: embedded JSON product patterns
  if (products.length === 0) {
    const jsonPatterns = [
      /"productName"\s*:\s*"([^"]+)"[\s\S]*?"salePrice"\s*:\s*(\d+)/g,
      /"name"\s*:\s*"([^"]+)"[\s\S]*?"channelProductPrice"\s*:\s*(\d+)/g,
    ];
    for (const pattern of jsonPatterns) {
      let m;
      while ((m = pattern.exec(html)) !== null) {
        const name = m[1];
        const price = parseInt(m[2], 10);
        if (!seen.has(name) && name.length > 1 && price > 0) {
          seen.add(name);
          products.push({
            name,
            price: `${price.toLocaleString()}원`,
            url: brandStoreUrl,
            source: "naver_brand_store",
          });
        }
      }
      if (products.length > 0) break;
    }
  }

  return { url: brandStoreUrl, products: products.slice(0, 20) };
}

// Strategy 3: Scrape official website
async function scrapeOfficialSite(competitorName: string): Promise<{ url: string; products: DiscoveredProduct[] }> {
  const products: DiscoveredProduct[] = [];
  const seen = new Set<string>();

  // Search Naver for official site
  const searchUrl = `https://search.naver.com/search.naver?query=${encodeURIComponent(competitorName + " 공식 홈페이지")}`;
  const searchHtml = await fetchPage(searchUrl);

  let officialUrl = "";

  if (searchHtml) {
    // Find non-Naver, non-social HTTPS links
    const linkRegex = /href="(https:\/\/(?:www\.)?[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^"]*)?)"[^>]*>/g;
    let match;
    while ((match = linkRegex.exec(searchHtml)) !== null) {
      const href = match[1];
      if (
        href.includes("naver.") || href.includes("google.") ||
        href.includes("facebook.") || href.includes("instagram.") ||
        href.includes("youtube.") || href.includes("twitter.") ||
        href.includes("pstatic.net") || href.includes("blogspot") ||
        href.includes("tistory") || href.includes("wikipedia")
      ) continue;
      officialUrl = href.split("?")[0];
      break;
    }
  }

  if (!officialUrl) return { url: "", products: [] };

  // Fetch official site
  const html = await fetchPage(officialUrl);
  if (!html || html.length < 500) return { url: officialUrl, products: [] };

  // Extract from JSON-LD
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let jsonLdMatch;
  while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(jsonLdMatch[1]);
      const items = data["@type"] === "Product" ? [data] :
        data["@type"] === "ItemList" ? (data.itemListElement || []).map((e: any) => e.item || e) :
        data["@graph"]?.filter((i: any) => i["@type"] === "Product") || [];
      for (const item of items) {
        if (item.name && !seen.has(item.name)) {
          seen.add(item.name);
          const price = item.offers?.price || item.offers?.lowPrice || "";
          products.push({
            name: item.name,
            price: price ? `${Number(price).toLocaleString()}원` : "",
            url: item.url || officialUrl,
            imageUrl: typeof item.image === "string" ? item.image : item.image?.[0] || undefined,
            source: "official",
          });
        }
      }
    } catch { /* skip */ }
  }

  return { url: officialUrl, products: products.slice(0, 20) };
}

// Main function: discover products from a competitor
export async function discoverProducts(competitorName: string): Promise<{
  products: DiscoveredProduct[];
  baseUrl: string;
  platform: string;
}> {
  const allProducts: DiscoveredProduct[] = [];
  const seen = new Set<string>();
  let baseUrl = "";
  let platform = "unknown";

  // 1. Try Naver brand store first (most structured data)
  const brandStore = await findNaverBrandStore(competitorName);
  if (brandStore.products.length > 0) {
    baseUrl = brandStore.url;
    platform = "naver_brand_store";
    for (const p of brandStore.products) {
      if (!seen.has(p.name)) {
        seen.add(p.name);
        allProducts.push(p);
      }
    }
  }

  // 2. Try Naver Shopping search
  if (allProducts.length < 5) {
    const shoppingProducts = await searchNaverShopping(competitorName);
    for (const p of shoppingProducts) {
      if (!seen.has(p.name)) {
        seen.add(p.name);
        allProducts.push(p);
      }
    }
    if (!baseUrl && shoppingProducts.length > 0) {
      baseUrl = `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(competitorName)}`;
      platform = "naver_shopping";
    }
  }

  // 3. Try official site
  if (allProducts.length < 5) {
    const official = await scrapeOfficialSite(competitorName);
    if (official.products.length > 0) {
      for (const p of official.products) {
        if (!seen.has(p.name)) {
          seen.add(p.name);
          allProducts.push(p);
        }
      }
      if (!baseUrl) {
        baseUrl = official.url;
        platform = "official";
      }
    }
  }

  return {
    products: allProducts.slice(0, 20),
    baseUrl,
    platform,
  };
}
