import { generateDomainCandidates, probeDomain, detectPlatform } from "./brandstore-service.js";

export interface DiscoveredProduct {
  name: string;
  price: string;
  url: string;
  imageUrl?: string;
}

// Generate product listing page candidates based on platform
function generateProductPagePaths(platform: string): string[] {
  const generic = [
    "/products", "/product", "/shop", "/store",
    "/shop/list", "/goods", "/item", "/all",
    "/collection", "/collections/all",
  ];

  const platformPaths: Record<string, string[]> = {
    cafe24: [
      "/product/list.html",
      "/product/list_all.html",
      "/category/list.html",
    ],
    godomall: [
      "/goods/goods_list.php",
      "/shop/goods/goods_list.php",
    ],
    makeshop: [
      "/shop/shopbrand.html",
      "/shop/big_section.html",
    ],
    shopify: [
      "/collections/all",
      "/collections",
      "/products",
    ],
    wordpress: [
      "/shop",
      "/product-category",
      "/store",
    ],
  };

  return [...generic, ...(platformPaths[platform] || [])];
}

// Extract products from HTML content
export function extractProducts(html: string, baseUrl: string): DiscoveredProduct[] {
  const products: DiscoveredProduct[] = [];
  const seen = new Set<string>();

  // Price patterns for Korean won
  const pricePatterns = [
    /₩\s*([\d,]+)/g,
    /([\d,]+)\s*원/g,
    /(\d{1,3}(?:,\d{3})+)(?=\s*<)/g,
  ];

  // Strategy 1: Find product-like blocks with structured data (JSON-LD)
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let jsonLdMatch;
  while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(jsonLdMatch[1]);
      const items = data["@type"] === "Product" ? [data] :
        data["@graph"]?.filter((i: any) => i["@type"] === "Product") || [];

      for (const item of items) {
        const name = item.name;
        const price = item.offers?.price || item.offers?.lowPrice || "";
        const url = item.url || item["@id"] || "";
        const imageUrl = typeof item.image === "string" ? item.image :
          Array.isArray(item.image) ? item.image[0] : item.image?.url || "";

        if (name && !seen.has(name)) {
          seen.add(name);
          const priceStr = price ? `${Number(price).toLocaleString()}원` : "";
          products.push({
            name,
            price: priceStr,
            url: url.startsWith("http") ? url : new URL(url, baseUrl).toString(),
            imageUrl: imageUrl?.startsWith("http") ? imageUrl : imageUrl ? new URL(imageUrl, baseUrl).toString() : undefined,
          });
        }
      }
    } catch {
      // Skip invalid JSON-LD
    }
  }

  // Strategy 2: Find product links with names and prices nearby
  // Look for common product card patterns
  const productBlockRegex = /<(?:div|li|article)[^>]*class="[^"]*(?:product|item|goods)[^"]*"[^>]*>([\s\S]*?)(?=<\/(?:div|li|article)>)/gi;
  let blockMatch;
  while ((blockMatch = productBlockRegex.exec(html)) !== null) {
    const block = blockMatch[1];

    // Extract product name from headings or links
    const nameMatch = block.match(/<(?:h[2-5]|a|span|p)[^>]*class="[^"]*(?:name|title|tit)[^"]*"[^>]*>([^<]+)/i)
      || block.match(/<a[^>]*>([^<]{2,60})<\/a>/i)
      || block.match(/<h[2-5][^>]*>([^<]+)/i);

    // Extract price
    let priceStr = "";
    for (const pattern of pricePatterns) {
      pattern.lastIndex = 0;
      const pm = pattern.exec(block);
      if (pm) {
        priceStr = pm[0];
        break;
      }
    }

    // Extract URL
    const urlMatch = block.match(/href=["']([^"'#]+)["']/i);

    // Extract image
    const imgMatch = block.match(/src=["']([^"']+\.(?:jpg|jpeg|png|webp|gif)[^"']*)["']/i);

    if (nameMatch) {
      const name = nameMatch[1].trim();
      if (name.length >= 2 && name.length <= 100 && !seen.has(name)) {
        seen.add(name);
        let productUrl = baseUrl;
        if (urlMatch) {
          try {
            productUrl = new URL(urlMatch[1], baseUrl).toString();
          } catch { /* keep baseUrl */ }
        }
        let imageUrl: string | undefined;
        if (imgMatch) {
          try {
            imageUrl = new URL(imgMatch[1], baseUrl).toString();
          } catch { /* skip */ }
        }

        products.push({ name, price: priceStr, url: productUrl, imageUrl });
      }
    }
  }

  // Strategy 3: Fallback - look for <a> tags with product-like URLs and nearby prices
  if (products.length === 0) {
    const linkRegex = /<a[^>]*href=["']([^"']*(?:product|goods|item)[^"']*)["'][^>]*>([^<]{2,60})<\/a>/gi;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(html)) !== null) {
      const href = linkMatch[1];
      const name = linkMatch[2].trim();
      if (name && !seen.has(name) && name.length >= 2) {
        seen.add(name);
        let productUrl = baseUrl;
        try {
          productUrl = new URL(href, baseUrl).toString();
        } catch { /* keep baseUrl */ }
        products.push({ name, price: "", url: productUrl });
      }
    }
  }

  return products.slice(0, 30); // Limit to 30 products
}

// Main function: discover products from a competitor's website
export async function discoverProducts(competitorName: string): Promise<{
  products: DiscoveredProduct[];
  baseUrl: string;
  platform: string;
}> {
  const domainCandidates = generateDomainCandidates(competitorName);

  // Find first valid domain
  let validBaseUrl = "";
  for (const domain of domainCandidates) {
    const result = await probeDomain(domain);
    if (result.isValid) {
      validBaseUrl = domain;
      break;
    }
  }

  if (!validBaseUrl) {
    return { products: [], baseUrl: "", platform: "unknown" };
  }

  // Fetch homepage to detect platform
  let platform = "generic";
  let homepageHtml = "";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(validBaseUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    clearTimeout(timeout);
    if (response.ok) {
      homepageHtml = await response.text();
      platform = detectPlatform(homepageHtml, validBaseUrl);
    }
  } catch {
    // Continue with generic platform
  }

  // Try to extract products from homepage first
  let products = extractProducts(homepageHtml, validBaseUrl);

  // If not enough products from homepage, try product listing pages
  if (products.length < 5) {
    const productPaths = generateProductPagePaths(platform);
    for (const path of productPaths) {
      if (products.length >= 10) break;

      try {
        const fullUrl = new URL(path, validBaseUrl).toString();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(fullUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        });
        clearTimeout(timeout);

        if (response.ok) {
          const html = await response.text();
          const pageProducts = extractProducts(html, validBaseUrl);
          // Merge without duplicates
          for (const p of pageProducts) {
            if (!products.some(existing => existing.name === p.name)) {
              products.push(p);
            }
          }
        }
      } catch {
        // Skip failed pages
      }
    }
  }

  return { products, baseUrl: validBaseUrl, platform };
}
