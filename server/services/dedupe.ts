import { EventItem } from "@shared/schema";

export function deduplicateEvents(events: EventItem[]): EventItem[] {
  const seen = new Set<string>();
  const unique: EventItem[] = [];
  
  for (const event of events) {
    // Create a unique key based on company, title, and URL
    const key = `${event.companyName}:${event.title}:${event.url}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(event);
    }
  }
  
  return unique;
}

export function deduplicateByUrl(events: EventItem[]): EventItem[] {
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
