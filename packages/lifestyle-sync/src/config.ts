import { API_PREFIX } from "shared";

export const AUTH_TOKEN_KEY = "lifestyle-auth-v1";
export const AUTH_USER_KEY = "lifestyle-auth-user-v1";

export function getApiBaseUrl(): string {
  const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
  const fromEnv = env?.VITE_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  // 手机通过局域网 IP 打开 App 时，API 需指向同一台电脑的 IP，不能用 localhost
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    const port = env?.VITE_API_PORT?.trim() || "4000";
    return `${protocol}//${hostname}:${port}`;
  }

  return "http://localhost:4000";
}

export function apiUrl(path: string): string {
  return `${getApiBaseUrl()}${API_PREFIX}${path}`;
}
