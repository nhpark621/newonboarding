import { EventItem } from "@shared/schema";
import { DiscoveredLink } from "./linkDiscover";
import { randomUUID } from "crypto";

export interface ExtractedEvent {
  title: string;
  url: string;
  startDate: string | null;
  endDate: string | null;
  channelId: string;
  companyName: string;
}

// Extract event details from discovered links
export async function extractEvents(
  links: DiscoveredLink[],
  limitDays: number = 30
): Promise<EventItem[]> {
  const events: EventItem[] = [];
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - limitDays * 24 * 60 * 60 * 1000);
  
  for (const link of links) {
    const event = await extractEventFromLink(link);
    
    // Only include events from the last 30 days
    if (event && isWithinDateRange(event, thirtyDaysAgo, now)) {
      events.push(event);
    }
  }
  
  return events;
}

async function extractEventFromLink(link: DiscoveredLink): Promise<EventItem | null> {
  // Mock event extraction - in production, this would parse the actual page
  const now = new Date();
  
  // Generate random dates within last 30 days and next 60 days
  const startDaysAgo = Math.floor(Math.random() * 30);
  const durationDays = Math.floor(Math.random() * 60) + 7;
  
  const startDate = new Date(now.getTime() - startDaysAgo * 24 * 60 * 60 * 1000);
  const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
  
  const isActive = now >= startDate && now <= endDate;
  
  return {
    id: randomUUID(),
    channelId: link.channelId,
    companyName: link.companyName,
    title: link.title,
    url: link.url,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    isActive,
    discoveredAt: new Date()
  };
}

function isWithinDateRange(
  event: EventItem,
  fromDate: Date,
  toDate: Date
): boolean {
  const discoveredAt = new Date(event.discoveredAt);
  return discoveredAt >= fromDate && discoveredAt <= toDate;
}

export function filterNewEvents(events: EventItem[]): EventItem[] {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return events.filter(event => 
    new Date(event.discoveredAt) >= thirtyDaysAgo
  );
}

export function filterEndingSoon(events: EventItem[]): EventItem[] {
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  return events.filter(event => {
    if (!event.endDate || !event.isActive) return false;
    const endDate = new Date(event.endDate);
    return endDate >= now && endDate <= sevenDaysLater;
  });
}
