import { API_PREFIX } from "shared";

const DEFAULT_LAN_HOST = "192.168.1.4";
const HOME_CHECK_MS = 2500;

let preferredBase: string | null = null;

function readEnvUrl(): string | undefined {
  const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
  return env?.VITE_HOME_API_URL?.trim() || undefined;
}

function parseLanHost(): string {
  const fromEnv = readEnvUrl();
  if (fromEnv) {
    try {
      return new URL(fromEnv).hostname;
    } catch {
      // ignore
    }
  }
  return DEFAULT_LAN_HOST;
}

function envApiBase(): string | null {
  const fromEnv = readEnvUrl();
  if (!fromEnv) return null;
  return `${fromEnv.replace(/\/$/, "")}${API_PREFIX}`;
}

/** 与 daily-journal 相同：直连家里 4000 → 同源 /api 代理 */
export function getApiBases(): string[] {
  const list: string[] = [];
  if (preferredBase) list.push(preferredBase);

  const host = parseLanHost();
  const directHttps = `https://${host}:4000${API_PREFIX}`;
  const directHttp = `http://${host}:4000${API_PREFIX}`;
  const viaApp =
    typeof window !== "undefined"
      ? `${window.location.origin.replace(/\/$/, "")}${API_PREFIX}`
      : null;

  for (const base of [envApiBase(), directHttps, directHttp, viaApp]) {
    if (base && !list.includes(base)) list.push(base);
  }
  return list;
}

export function rememberWorkingBase(url: string) {
  for (const base of getApiBases()) {
    if (url.startsWith(base)) {
      preferredBase = base;
      return;
    }
  }
}

export function resetPreferredBase() {
  preferredBase = null;
}

/** @deprecated 优先使用 getApiBases */
export function getHomeApiBaseUrl(): string {
  const bases = getApiBases();
  if (bases.length > 0) {
    return bases[0].slice(0, -API_PREFIX.length);
  }
  return `https://${DEFAULT_LAN_HOST}:4000`;
}

export function homeApiUrl(path: string): string {
  const base = getApiBases()[0] ?? `${getHomeApiBaseUrl()}${API_PREFIX}`;
  const sep = path.startsWith("?") ? "&" : "?";
  return `${base}${path}${sep}_t=${Date.now()}`;
}

let homeReachableCache: { at: number; ok: boolean } | null = null;

/** 检测家里同步服务器是否在线（连家里 Wi‑Fi 时为 true） */
export async function isHomeServerReachable(force = false): Promise<boolean> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    homeReachableCache = { at: Date.now(), ok: false };
    return false;
  }

  const now = Date.now();
  if (!force && homeReachableCache && now - homeReachableCache.at < 8000) {
    return homeReachableCache.ok;
  }

  for (const base of getApiBases()) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), HOME_CHECK_MS);
      const res = await fetch(`${base}/health?_t=${Date.now()}`, {
        signal: ctrl.signal,
        cache: "no-store",
      });
      clearTimeout(timer);
      const text = await res.text();
      if (text.includes('"success":true') || text.includes('"success": true')) {
        rememberWorkingBase(base);
        homeReachableCache = { at: now, ok: true };
        return true;
      }
    } catch {
      // 尝试下一个地址
    }
  }

  homeReachableCache = { at: now, ok: false };
  return false;
}

export function clearHomeReachableCache() {
  homeReachableCache = null;
  resetPreferredBase();
}

const PENDING_KEY = "lifestyle-pending-sync-keys";

export function markPendingSync(appKey: string) {
  try {
    const set = new Set(readPendingSyncKeys());
    set.add(appKey);
    localStorage.setItem(PENDING_KEY, JSON.stringify([...set]));
  } catch {
    // ignore
  }
}

export function clearPendingSync(appKey: string) {
  try {
    const set = new Set(readPendingSyncKeys());
    set.delete(appKey);
    localStorage.setItem(PENDING_KEY, JSON.stringify([...set]));
  } catch {
    // ignore
  }
}

export function readPendingSyncKeys(): string[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((k) => typeof k === "string") : [];
  } catch {
    return [];
  }
}
