export interface EventParameters {
  [key: string]: string | number | boolean;
}

export function trackEvent(eventName: string, parameters: EventParameters = {}) {
  // Log event to console for development
  console.log(`Event tracked: ${eventName}`, parameters);
  
  // TODO: Integrate with GA4 or custom analytics
  // Example GA4 integration:
  // if (typeof gtag !== 'undefined') {
  //   gtag('event', eventName, parameters);
  // }
  
  // Example custom analytics:
  // if (window.analytics) {
  //   window.analytics.track(eventName, parameters);
  // }
}
