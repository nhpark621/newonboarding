import { Channel } from "@shared/schema";

export interface DiscoveredLink {
  url: string;
  title: string;
  channelId: string;
  companyName: string;
}

// Mock link discovery - in production, this would actually crawl the pages
export async function discoverLinks(
  channels: Channel[],
  limitPages: number = 2
): Promise<DiscoveredLink[]> {
  const discovered: DiscoveredLink[] = [];
  
  for (const channel of channels) {
    // Mock discovered links for each channel
    const mockLinks = generateMockLinks(channel, limitPages);
    discovered.push(...mockLinks);
  }
  
  return discovered;
}

function generateMockLinks(
  channel: Channel,
  limitPages: number
): DiscoveredLink[] {
  const links: DiscoveredLink[] = [];
  const eventTypes = [
    "신규 가입 이벤트",
    "시즌 할인 프로모션",
    "추천인 적립금 증정",
    "첫 구매 혜택",
    "월간 특가 세일",
    "친구 초대 이벤트",
    "앱 다운로드 쿠폰"
  ];
  
  // Generate 3-5 mock events per channel
  const numEvents = Math.floor(Math.random() * 3) + 3;
  
  for (let i = 0; i < Math.min(numEvents, limitPages * 5); i++) {
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    links.push({
      url: `${channel.url}/detail/${i + 1}`,
      title: `${channel.companyName} ${eventType}`,
      channelId: channel.id,
      companyName: channel.companyName
    });
  }
  
  return links;
}
