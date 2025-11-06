import { Channel, EventItem, EventsSummary } from "@shared/schema";
import { filterNewEvents, filterEndingSoon } from "./eventExtract";

// In-memory storage for MVP (can be upgraded to actual database later)
export class EventStorage {
  private channels: Map<string, Channel[]> = new Map();
  private events: Map<string, EventItem[]> = new Map();

  // Store channels for a company
  storeChannels(companyId: string, channels: Channel[]): void {
    this.channels.set(companyId, channels);
  }

  // Get channels for a company
  getChannels(companyId: string): Channel[] {
    return this.channels.get(companyId) || [];
  }

  // Store events for a company
  storeEvents(companyId: string, events: EventItem[]): void {
    const existing = this.events.get(companyId) || [];
    // Merge and deduplicate
    const merged = [...existing, ...events];
    const unique = this.deduplicateEvents(merged);
    this.events.set(companyId, unique);
  }

  // Get events for a company
  getEvents(companyId: string): EventItem[] {
    return this.events.get(companyId) || [];
  }

  // Get summary for a company
  getSummary(companyId: string): EventsSummary {
    const channels = this.getChannels(companyId);
    const events = this.getEvents(companyId);
    
    const newIn30Days = filterNewEvents(events);
    const endingSoon = filterEndingSoon(events);
    
    // Count total discovered links (approximation based on events)
    const totalLinks = events.length * 1.5; // Assume some links don't convert to events
    
    return {
      totalChannels: channels.length,
      totalLinks: Math.floor(totalLinks),
      newEventsCount: newIn30Days.length,
      endingSoonCount: endingSoon.length,
      events: {
        newIn30Days,
        endingSoon
      }
    };
  }

  // Helper: deduplicate events by URL
  private deduplicateEvents(events: EventItem[]): EventItem[] {
    const seen = new Set<string>();
    const unique: EventItem[] = [];
    
    for (const event of events) {
      if (!seen.has(event.url)) {
        seen.add(event.url);
        unique.push(event);
      }
    }
    
    return unique;
  }

  // Clear all data for a company (useful for testing)
  clear(companyId: string): void {
    this.channels.delete(companyId);
    this.events.delete(companyId);
  }
}

export const eventStorage = new EventStorage();
