import { Channel } from "@shared/schema";
import { detectIndustry, getCommonPaths } from "./industryMap";
import { randomUUID } from "crypto";

export interface ChannelSuggestion {
  companyName: string;
  baseUrl: string;
  paths: string[];
}

// Mock function to generate base URLs for competitors
function generateBaseUrl(companyName: string): string {
  // In a real implementation, this would search for the company's actual website
  // For MVP, we'll generate a mock URL
  const slug = companyName.toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
  return `https://www.${slug}.com`;
}

export async function suggestChannels(
  productOrService: string,
  competitors: string[]
): Promise<ChannelSuggestion[]> {
  const industry = detectIndustry(productOrService);
  const commonPaths = getCommonPaths(industry);
  
  const suggestions: ChannelSuggestion[] = competitors.map(companyName => ({
    companyName,
    baseUrl: generateBaseUrl(companyName),
    paths: commonPaths
  }));
  
  return suggestions;
}

export function createChannelsFromSuggestions(
  suggestions: ChannelSuggestion[]
): Channel[] {
  const channels: Channel[] = [];
  
  for (const suggestion of suggestions) {
    for (const path of suggestion.paths) {
      channels.push({
        id: randomUUID(),
        companyName: suggestion.companyName,
        channelType: "이벤트 페이지",
        url: `${suggestion.baseUrl}${path}`,
        path: path,
        createdAt: new Date()
      });
    }
  }
  
  return channels;
}
