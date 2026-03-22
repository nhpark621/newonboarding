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

// Fetch page HTML with browser-like headers
async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
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

// Strategy 1: Search Naver to find official website and brand store
async function findSitesViaNaver(competitorName: string): Promise<{ officialUrls: string[]; brandStoreUrls: string[] }> {
  const officialUrls: string[] = [];
  const brandStoreUrls: string[] = [];
  const seen = new Set<string>();

  // Search 1: Find official site
  const searchUrl1 = `https://search.naver.com/search.naver?query=${encodeURIComponent(competitorName + " 공식몰")}`;
  const html1 = await fetchPage(searchUrl1);
  if (html1) {
    const linkRegex = /href="(https?:\/\/[^"]+)"/gi;
    let match;
    while ((match = linkRegex.exec(html1)) !== null) {
      const href = match[1];
      if (seen.has(href)) continue;
      seen.add(href);

      // Collect brand store URLs separately
      if (href.includes("brand.naver.com/") || href.includes("smartstore.naver.com/")) {
        const path = href.replace(/https?:\/\/(brand|smartstore)\.naver\.com\/?/, "");
        if (path && path.length > 1 && !path.startsWith("?")) {
          brandStoreUrls.push(href);
        }
        continue;
      }

      // Skip other Naver/social links
      if (
        href.includes("naver.com") || href.includes("naver.net") ||
        href.includes("google.") || href.includes("facebook.") ||
        href.includes("instagram.") || href.includes("youtube.")
      ) continue;

      if (href.startsWith("https://")) {
        officialUrls.push(href);
      }
    }
  }

  // Search 2: Find brand store specifically
  const searchUrl2 = `https://search.naver.com/search.naver?query=${encodeURIComponent(competitorName + " 네이버 브랜드스토어")}`;
  const html2 = await fetchPage(searchUrl2);
  if (html2) {
    const brandRegex = /href="(https?:\/\/(?:brand|smartstore)\.naver\.com\/[a-zA-Z0-9_-]+[^"]*)"/gi;
    let match;
    while ((match = brandRegex.exec(html2)) !== null) {
      const href = match[1].split("?")[0]; // Remove query params
      if (!seen.has(href)) {
        seen.add(href);
        brandStoreUrls.push(href);
      }
    }
  }

  return {
    officialUrls: officialUrls.slice(0, 5),
    brandStoreUrls: brandStoreUrls.slice(0, 3),
  };
}

// Strategy 2: Generate Naver brand store URLs
function generateNaverBrandStoreUrls(competitorName: string): string[] {
  const sanitized = competitorName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const sanitizedNoSpace = competitorName.replace(/\s+/g, "").toLowerCase();

  return [
    `https://brand.naver.com/${sanitized}`,
    `https://brand.naver.com/${sanitizedNoSpace}`,
    `https://smartstore.naver.com/${sanitized}`,
    `https://smartstore.naver.com/${sanitizedNoSpace}`,
  ];
}

// Strategy 3: Generate common domain candidates
function generateDomainCandidates(competitorName: string): string[] {
  const sanitized = competitorName.toLowerCase().replace(/[^a-z0-9]/g, "");
  return [
    `https://www.${sanitized}.co.kr`,
    `https://www.${sanitized}.com`,
    `https://${sanitized}.co.kr`,
    `https://${sanitized}.com`,
    `https://www.${sanitized}.com/kr`,
    `https://shop.${sanitized}.com`,
    `https://store.${sanitized}.com`,
  ];
}

// Probe if a URL is valid (returns HTML)
async function probeUrl(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

// Extract products from Naver brand store / smartstore HTML
function extractNaverStoreProducts(html: string, baseUrl: string): DiscoveredProduct[] {
  const products: DiscoveredProduct[] = [];
  const seen = new Set<string>();

  // Look for __NEXT_DATA__ (Naver uses Next.js)
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextDataMatch) {
    try {
      const data = JSON.parse(nextDataMatch[1]);
      // Navigate through Next.js data structure to find products
      const pageProps = data?.props?.pageProps;
      if (pageProps) {
        const extractFromObj = (obj: any) => {
          if (!obj || typeof obj !== "object") return;
          // Look for product-like objects
          if (obj.name && (obj.price || obj.salePrice || obj.discountedPrice)) {
            const name = String(obj.name);
            if (!seen.has(name) && name.length > 1 && name.length < 100) {
              seen.add(name);
              const price = obj.salePrice || obj.discountedPrice || obj.price || "";
              products.push({
                name,
                price: typeof price === "number" ? `${price.toLocaleString()}원` : String(price),
                url: obj.url || obj.productUrl || baseUrl,
                imageUrl: obj.imageUrl || obj.image || obj.thumbnailUrl || undefined,
                source: "naver",
              });
            }
          }
          // Recurse
          if (Array.isArray(obj)) {
            obj.forEach(extractFromObj);
          } else {
            Object.values(obj).forEach(extractFromObj);
          }
        };
        extractFromObj(pageProps);
      }
    } catch {
      // Skip JSON parse error
    }
  }

  // Fallback: look for product patterns in HTML
  if (products.length === 0) {
    // Naver store product card patterns
    const productPatterns = [
      /"productName"\s*:\s*"([^"]+)"[\s\S]*?"salePrice"\s*:\s*(\d+)/g,
      /"name"\s*:\s*"([^"]+)"[\s\S]*?"price"\s*:\s*(\d+)/g,
    ];

    for (const pattern of productPatterns) {
      let m;
      while ((m = pattern.exec(html)) !== null) {
        const name = m[1];
        const price = parseInt(m[2], 10);
        if (!seen.has(name) && name.length > 1 && price > 0) {
          seen.add(name);
          products.push({
            name,
            price: `${price.toLocaleString()}원`,
            url: baseUrl,
            source: "naver",
          });
        }
      }
    }
  }

  return products;
}

// Extract products from general e-commerce HTML
function extractProductsFromHtml(html: string, baseUrl: string): DiscoveredProduct[] {
  const products: DiscoveredProduct[] = [];
  const seen = new Set<string>();

  // Strategy 1: JSON-LD structured data
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let jsonLdMatch;
  while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(jsonLdMatch[1]);
      const items = data["@type"] === "Product" ? [data] :
        data["@type"] === "ItemList" ? (data.itemListElement || []).map((e: any) => e.item || e) :
        data["@graph"]?.filter((i: any) => i["@type"] === "Product") || [];

      for (const item of items) {
        const name = item.name;
        if (name && !seen.has(name)) {
          seen.add(name);
          const price = item.offers?.price || item.offers?.lowPrice || "";
          products.push({
            name,
            price: price ? `${Number(price).toLocaleString()}원` : "",
            url: item.url || baseUrl,
            imageUrl: typeof item.image === "string" ? item.image : item.image?.[0] || undefined,
            source: "official",
          });
        }
      }
    } catch { /* skip */ }
  }

  // Strategy 2: Look for embedded product JSON data
  const jsonPatterns = [
    /"products"\s*:\s*(\[[\s\S]*?\])/g,
    /"items"\s*:\s*(\[[\s\S]*?\])/g,
  ];
  for (const pattern of jsonPatterns) {
    let m;
    while ((m = pattern.exec(html)) !== null) {
      try {
        const items = JSON.parse(m[1]);
        for (const item of items) {
          const name = item.name || item.title || item.productName;
          if (name && !seen.has(name) && name.length > 1) {
            seen.add(name);
            const price = item.price || item.salePrice || item.discountPrice || "";
            products.push({
              name,
              price: typeof price === "number" ? `${price.toLocaleString()}원` : String(price),
              url: item.url || item.link || baseUrl,
              imageUrl: item.image || item.imageUrl || item.thumbnail || undefined,
              source: "official",
            });
          }
        }
      } catch { /* skip */ }
    }
  }

  // Strategy 3: HTML product card patterns
  if (products.length === 0) {
    const productBlockRegex = /<(?:div|li|article|a)[^>]*class="[^"]*(?:product|item|goods)[^"]*"[^>]*>([\s\S]*?)(?=<\/(?:div|li|article|a)>)/gi;
    let blockMatch;
    while ((blockMatch = productBlockRegex.exec(html)) !== null) {
      const block = blockMatch[1];
      const nameMatch = block.match(/<(?:h[2-5]|a|span|p)[^>]*>([^<]{2,80})<\/(?:h[2-5]|a|span|p)>/i);
      const priceMatch = block.match(/([\d,]+)\s*원/);
      const urlMatch = block.match(/href=["']([^"'#]+)["']/i);

      if (nameMatch) {
        const name = nameMatch[1].trim();
        if (!seen.has(name) && name.length >= 2) {
          seen.add(name);
          let productUrl = baseUrl;
          if (urlMatch) {
            try { productUrl = new URL(urlMatch[1], baseUrl).toString(); } catch { /* keep base */ }
          }
          products.push({
            name,
            price: priceMatch ? priceMatch[0] : "",
            url: productUrl,
            source: "official",
          });
        }
      }
    }
  }

  return products;
}

// Extract text for GPT analysis
function extractTextContent(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 5000);
}

// Optional: Use GPT to extract products from text (fallback)
async function extractProductsWithGPT(
  textContent: string,
  sourceUrl: string,
  competitorName: string
): Promise<DiscoveredProduct[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "웹페이지 텍스트에서 제품명과 가격을 추출하세요.",
        },
        {
          role: "user",
          content: `"${competitorName}" 스토어 페이지(${sourceUrl})의 텍스트에서 제품명과 가격을 추출해주세요.\n\n${textContent}\n\nJSON: {"products": [{"name": "제품명", "price": "가격"}]}`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return (result.products || [])
      .filter((p: any) => p.name)
      .map((p: any) => ({
        name: p.name,
        price: p.price || "",
        url: sourceUrl,
        source: "gpt",
      }));
  } catch {
    return [];
  }
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

  // Collect all candidate URLs
  const candidateUrls: string[] = [];

  // 1. Search Naver to find real URLs (most reliable)
  const naverResults = await findSitesViaNaver(competitorName);
  candidateUrls.push(...naverResults.brandStoreUrls);
  candidateUrls.push(...naverResults.officialUrls);

  // 2. Naver brand store / smartstore guesses
  candidateUrls.push(...generateNaverBrandStoreUrls(competitorName));

  // 3. Common domain patterns
  candidateUrls.push(...generateDomainCandidates(competitorName));

  // Probe URLs and fetch valid ones
  for (const url of candidateUrls) {
    if (allProducts.length >= 15) break;

    const isValid = await probeUrl(url);
    if (!isValid) continue;

    if (!baseUrl) baseUrl = url;

    const html = await fetchPage(url);
    if (!html || html.length < 500) continue;

    // Try Naver store extraction first
    let products: DiscoveredProduct[] = [];
    if (url.includes("brand.naver.com") || url.includes("smartstore.naver.com")) {
      products = extractNaverStoreProducts(html, url);
    }

    // Try general HTML extraction
    if (products.length === 0) {
      products = extractProductsFromHtml(html, url);
    }

    // Try GPT extraction as last resort
    if (products.length === 0) {
      const textContent = extractTextContent(html);
      if (textContent.length > 100) {
        products = await extractProductsWithGPT(textContent, url, competitorName);
      }
    }

    // Add to results
    for (const product of products) {
      if (!seen.has(product.name)) {
        seen.add(product.name);
        allProducts.push(product);
      }
    }
  }

  // Determine platform
  let platform = "official";
  if (baseUrl.includes("brand.naver.com") || baseUrl.includes("smartstore.naver.com")) {
    platform = "naver";
  }

  return {
    products: allProducts.slice(0, 20),
    baseUrl,
    platform,
  };
}
