import type { AuthUser } from "shared";
import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from "./config.js";

const PENDING_AUTH_KEY = "lifestyle-pending-auth-v1";

export type PendingAuth = { email: string; password: string };

export function loadPendingAuth(): PendingAuth | null {
  try {
    const raw = localStorage.getItem(PENDING_AUTH_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PendingAuth;
    if (!data.email || !data.password) return null;
    return data;
  } catch {
    return null;
  }
}

export function savePendingAuth(email: string, password: string) {
  localStorage.setItem(PENDING_AUTH_KEY, JSON.stringify({ email, password }));
}

export function clearPendingAuth() {
  localStorage.removeItem(PENDING_AUTH_KEY);
}

export function loadInitialSession(): {
  token: string | null;
  user: AuthUser | null;
  isPending: boolean;
} {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const userRaw = localStorage.getItem(AUTH_USER_KEY);
    if (token && userRaw) {
      return { token, user: JSON.parse(userRaw) as AuthUser, isPending: false };
    }
  } catch {
    // fall through
  }
  const pending = loadPendingAuth();
  if (pending) {
    return {
      token: null,
      user: { id: "pending", email: pending.email },
      isPending: true,
    };
  }
  return { token: null, user: null, isPending: false };
}
