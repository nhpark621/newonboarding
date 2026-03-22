import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key",
});

export interface DiscoveredProduct {
  name: string;
  price: string;
  url: string;
  imageUrl?: string;
}

// Fetch page HTML
async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
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

// Extract text content from HTML (strip tags, scripts, styles)
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

// Step 1: Ask GPT for the correct URLs to find products
async function getCompetitorUrls(competitorName: string): Promise<{
  officialUrl: string;
  naverBrandStore: string;
  productPageUrls: string[];
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "당신은 한국 e커머스 전문가입니다. 브랜드명을 받으면 해당 브랜드의 공식 온라인 스토어 URL과 네이버 브랜드 스토어 URL을 정확하게 알려줍니다.",
        },
        {
          role: "user",
          content: `"${competitorName}" 브랜드의 다음 URL을 알려주세요:

1. 한국 공식 온라인 스토어 URL (제품을 구매할 수 있는 공식몰)
2. 네이버 브랜드 스토어 URL (brand.naver.com/xxx 형태)
3. 공식몰에서 전체 제품 리스트를 볼 수 있는 페이지 URL (1~3개)

JSON으로 응답해주세요:
{
  "officialUrl": "https://...",
  "naverBrandStore": "https://brand.naver.com/...",
  "productPageUrls": ["https://...", "https://..."]
}

URL을 모르면 빈 문자열("")로 응답해주세요.`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 300,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      officialUrl: result.officialUrl || "",
      naverBrandStore: result.naverBrandStore || "",
      productPageUrls: result.productPageUrls || [],
    };
  } catch (error) {
    console.error("GPT URL discovery error:", error);
    return { officialUrl: "", naverBrandStore: "", productPageUrls: [] };
  }
}

// Step 2: Use GPT to extract products from HTML content
async function extractProductsWithGPT(
  htmlText: string,
  sourceUrl: string,
  competitorName: string
): Promise<DiscoveredProduct[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "당신은 웹페이지에서 제품 정보를 추출하는 전문가입니다. HTML 텍스트 내용을 분석하여 제품명과 가격을 정확하게 추출합니다.",
        },
        {
          role: "user",
          content: `다음은 "${competitorName}"의 온라인 스토어 페이지(${sourceUrl})에서 추출한 텍스트입니다.

이 텍스트에서 판매 중인 제품들의 이름과 가격을 추출해주세요.

텍스트 내용:
${htmlText}

JSON으로 응답해주세요:
{
  "products": [
    {"name": "제품명", "price": "가격 (예: 29,000원)"},
    ...
  ]
}

제품이 없으면 빈 배열로 응답해주세요. 최대 20개까지만 추출해주세요.`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    const products: DiscoveredProduct[] = (result.products || []).map((p: any) => ({
      name: p.name || "",
      price: p.price || "",
      url: sourceUrl,
    }));

    return products.filter((p) => p.name.length > 0);
  } catch (error) {
    console.error("GPT product extraction error:", error);
    return [];
  }
}

// Main function: discover products from a competitor
export async function discoverProducts(competitorName: string): Promise<{
  products: DiscoveredProduct[];
  baseUrl: string;
  platform: string;
}> {
  // Step 1: Get correct URLs from GPT
  const urls = await getCompetitorUrls(competitorName);
  const allProducts: DiscoveredProduct[] = [];
  const seen = new Set<string>();
  let baseUrl = urls.officialUrl || urls.naverBrandStore || "";

  // Step 2: Fetch and extract from all candidate pages
  const pagesToFetch = [
    ...urls.productPageUrls,
    urls.officialUrl,
    urls.naverBrandStore,
  ].filter((url) => url && url.startsWith("http"));

  // Deduplicate URLs
  const uniquePages = Array.from(new Set(pagesToFetch));

  for (const pageUrl of uniquePages.slice(0, 4)) {
    const html = await fetchPage(pageUrl);
    if (!html) continue;

    const textContent = extractTextContent(html);
    if (textContent.length < 50) continue;

    const products = await extractProductsWithGPT(textContent, pageUrl, competitorName);

    for (const product of products) {
      if (!seen.has(product.name)) {
        seen.add(product.name);
        allProducts.push(product);
      }
    }

    // Stop if we have enough products
    if (allProducts.length >= 15) break;
  }

  // Determine source platform
  let platform = "official";
  if (baseUrl.includes("brand.naver.com")) {
    platform = "naver";
  }

  return {
    products: allProducts.slice(0, 20),
    baseUrl,
    platform,
  };
}
