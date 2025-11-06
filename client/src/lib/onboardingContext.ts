// Store and retrieve onboarding data in localStorage
export interface OnboardingData {
  userConcern: string;
  selectedServices: string[];
  userData: {
    id?: string;
    company: string;
    team: string;
    product: string;
    competitors?: string[];
  };
}

const STORAGE_KEY = 'underwatch_onboarding';

export function saveOnboardingData(data: OnboardingData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getOnboardingData(): OnboardingData | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function clearOnboardingData(): void {
  localStorage.removeItem(STORAGE_KEY);
}
