// lib/auth.ts
export const SESSION_TIMEOUT_MINUTES = 30;

const TOKEN_KEY = "crm_token";
const USER_KEY = "crm_user";
const LAST_ACTIVITY_KEY = "crm_last_activity";

export type AuthUser = {
  userId: string;
  nome: string;
  email: string;
};

export function getSessionTimeoutMs() {
  return SESSION_TIMEOUT_MINUTES * 60 * 1000;
}

export function setAuthSession(token: string, user: AuthUser) {
  if (typeof window === "undefined") return;

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(LAST_ACTIVITY_KEY);
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function touchSession() {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

export function isSessionExpired() {
  if (typeof window === "undefined") return true;

  const token = localStorage.getItem(TOKEN_KEY);
  const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);

  if (!token || !lastActivity) return true;

  const diff = Date.now() - Number(lastActivity);
  return diff > getSessionTimeoutMs();
}

export function isAuthenticated() {
  if (typeof window === "undefined") return false;

  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return false;

  if (isSessionExpired()) {
    clearAuthSession();
    return false;
  }

  return true;
}