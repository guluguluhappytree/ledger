import type { ApiEnvelope, AuthUser, UserDataSnapshot } from "shared";
import { getApiBases, rememberWorkingBase } from "./homeSync.js";

const REQUEST_TIMEOUT_MS = 4000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("连接超时");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithFallback(path: string, init: RequestInit = {}): Promise<Response> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("当前无网络，数据仍安全保存在本机");
  }

  const bases = getApiBases();
  let lastError: unknown;

  for (const base of bases) {
    const url = `${base}${path}${path.includes("?") ? "&" : "?"}_t=${Date.now()}`;
    try {
      const res = await fetchWithTimeout(url, init);
      const text = await res.text();
      if (text.includes("API_PROXY") || text.includes("云同步代理异常")) {
        lastError = new Error(text);
        continue;
      }
      rememberWorkingBase(base);
      return new Response(text, {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
      });
    } catch (err) {
      lastError = err;
    }
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("当前无网络，数据仍安全保存在本机");
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(
        "无法连接云同步服务器。请连家里 Wi‑Fi，并确认电脑已运行 npm run dev:api（或 npm run dev:lifestyle）。",
      );
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, ...init } = options;
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  headers.set("Accept", "application/json");

  let res: Response;
  try {
    res = await fetchWithFallback(path, { ...init, headers });
  } catch (err) {
    throw err instanceof Error
      ? err
      : new Error(
          "无法连接云同步服务器。请连家里 Wi‑Fi，并确认电脑已运行 npm run dev:api（或 npm run dev:lifestyle）。",
        );
  }

  const raw = await res.text();
  let json: ApiEnvelope<T>;
  try {
    json = JSON.parse(raw) as ApiEnvelope<T>;
  } catch {
    const hint = raw.trim().slice(0, 80);
    const isHtml = hint.startsWith("<");
    throw new Error(
      isHtml
        ? `云同步请求被拦截（${res.status}）。请确认用 https:// 打开本 App，Safari 下拉刷新后再试`
        : `云同步服务响应异常（${res.status}）${hint ? `：${hint}` : ""}`,
    );
  }

  if (!json.success) {
    throw new Error(json.error.message);
  }
  return json.data;
}

export async function registerUser(
  email: string,
  password: string,
): Promise<{ token: string; user: AuthUser }> {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function loginUser(
  email: string,
  password: string,
): Promise<{ token: string; user: AuthUser }> {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchUserData(
  appKey: string,
  token: string,
): Promise<UserDataSnapshot | null> {
  return request(`/user-data/${encodeURIComponent(appKey)}`, { token });
}

export async function pushUserData(
  appKey: string,
  payload: unknown,
  token: string,
): Promise<UserDataSnapshot> {
  return request(`/user-data/${encodeURIComponent(appKey)}`, {
    method: "PUT",
    token,
    body: JSON.stringify({ payload }),
  });
}

export { sleep };
