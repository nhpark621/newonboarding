// Industry mapping for competitor analysis
export interface IndustryRule {
  keywords: string[];
  commonPaths: string[];
  channelTypes: string[];
}

export const industryMap: Record<string, IndustryRule> = {
  "ecommerce": {
    keywords: ["쇼핑", "스토어", "마켓", "몰", "commerce", "shop", "store"],
    commonPaths: ["/event", "/promotion", "/benefit", "/sale"],
    channelTypes: ["공식 홈페이지", "온라인 스토어"]
  },
  "fintech": {
    keywords: ["금융", "은행", "카드", "페이", "뱅크", "bank", "finance", "pay"],
    commonPaths: ["/event", "/promotion", "/benefit", "/campaign"],
    channelTypes: ["공식 홈페이지", "고객센터"]
  },
  "tech": {
    keywords: ["테크", "앱", "소프트웨어", "플랫폼", "app", "tech", "software"],
    commonPaths: ["/event", "/news", "/notice", "/blog"],
    channelTypes: ["공식 홈페이지", "개발자 블로그"]
  },
  "default": {
    keywords: [],
    commonPaths: ["/event", "/promotion", "/benefit", "/campaign", "/sale", "/notice", "/news"],
    channelTypes: ["공식 홈페이지"]
  }
};

export function detectIndustry(productOrService: string): string {
  const lowerProduct = productOrService.toLowerCase();
  
  for (const [industry, rules] of Object.entries(industryMap)) {
    if (industry === "default") continue;
    
    const hasKeyword = rules.keywords.some(keyword => 
      lowerProduct.includes(keyword.toLowerCase())
    );
    
    if (hasKeyword) {
      return industry;
    }
  }
  
  return "default";
}

export function getCommonPaths(industry: string): string[] {
  return industryMap[industry]?.commonPaths || industryMap.default.commonPaths;
}
