const TOKEN_KEY = "fantasy_access_token";
const ONBOARDING_KEY = "fantasy_onboarding_v1_done";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}

export function hasCompletedOnboarding(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ONBOARDING_KEY) === "1";
}

export function markOnboardingComplete(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ONBOARDING_KEY, "1");
}
