import {

  createContext,

  useCallback,

  useContext,

  useEffect,

  useMemo,

  useRef,

  useState,

  type ReactNode,

} from "react";

import type { AuthUser } from "shared";

import { loginUser, registerUser, fetchUserData, pushUserData } from "./client.js";

import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from "./config.js";

import {
  clearPendingAuth,
  loadInitialSession,
  loadPendingAuth,
  savePendingAuth,
} from "./authStorage.js";

import {

  clearHomeReachableCache,

  clearPendingSync,

  isHomeServerReachable,

  markPendingSync,

  readPendingSyncKeys,

} from "./homeSync.js";

import {

  getLocalUpdatedAt,

  isPayloadEmpty,

  readLocalPayload,

  setLocalUpdatedAt,

  touchLocalUpdatedAt,

  writeLocalPayload,

} from "./storage.js";



export type SyncStatus = "offline" | "local" | "idle" | "syncing" | "synced" | "error";



/** 一次合并的实际结果，用于决定是否显示「已备份」 */

type MergeResult = "pushed" | "pulled" | "confirmed" | "pending" | "skipped";



type SyncContextValue = {

  user: AuthUser | null;

  token: string | null;

  isPendingAuth: boolean;

  syncStatus: SyncStatus;

  syncError: string | null;

  login: (email: string, password: string) => Promise<void>;

  register: (email: string, password: string) => Promise<void>;

  logout: () => void;

  syncNow: () => Promise<void>;

  reportBackupSuccess: () => void;

};



const SyncContext = createContext<SyncContextValue | null>(null);

const STARTUP_DELAY_MS = 2000;



function isNetworkFailure(err: unknown): boolean {

  if (!(err instanceof Error)) return false;

  const msg = err.message.toLowerCase();

  return (

    msg.includes("无法连接") ||

    msg.includes("连接超时") ||

    msg.includes("load failed") ||

    msg.includes("failed to fetch") ||

    msg.includes("network") ||

    msg.includes("aborted") ||

    err.name === "AbortError"

  );

}



function persistAuth(token: string | null, user: AuthUser | null) {

  if (token && user) {

    localStorage.setItem(AUTH_TOKEN_KEY, token);

    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));

  } else {

    localStorage.removeItem(AUTH_TOKEN_KEY);

    localStorage.removeItem(AUTH_USER_KEY);

  }

}



function statusFromMerge(result: MergeResult): SyncStatus {

  if (result === "pushed" || result === "pulled" || result === "confirmed") return "synced";

  return "local";

}



function diaryEntryCount(payload: unknown): number {
  if (!payload || typeof payload !== "object") return Array.isArray(payload) ? payload.length : 0;
  const entries = (payload as { entries?: unknown[] }).entries;
  return Array.isArray(entries) ? entries.length : 0;
}

function shouldPreferRemoteDiary(appKey: string, localPayload: unknown, remotePayload: unknown): boolean {
  if (appKey !== "diary-app-v1") return false;
  const localN = diaryEntryCount(localPayload);
  const remoteN = diaryEntryCount(remotePayload);
  return remoteN >= 10 && remoteN > localN;
}



export function SyncProvider({

  appKey,

  children,

  onRemoteData,

}: {

  appKey: string;

  children: ReactNode;

  onRemoteData: (payload: unknown) => void;

}) {

  const initial = loadInitialSession();

  const [user, setUser] = useState<AuthUser | null>(initial.user);

  const [token, setToken] = useState<string | null>(initial.token);

  const [isPendingAuth, setIsPendingAuth] = useState(initial.isPending);

  const [syncStatus, setSyncStatus] = useState<SyncStatus>(

    initial.user ? "local" : "offline",

  );

  const [syncError, setSyncError] = useState<string | null>(null);

  const syncingRef = useRef(false);

  const onRemoteDataRef = useRef(onRemoteData);

  onRemoteDataRef.current = onRemoteData;



  const reportBackupSuccess = useCallback(() => {

    setSyncStatus("synced");

    setSyncError(null);

  }, []);



  const applyAuth = useCallback((nextToken: string, nextUser: AuthUser) => {

    setToken(nextToken);

    setUser(nextUser);

    setIsPendingAuth(false);

    persistAuth(nextToken, nextUser);

    clearPendingAuth();

    setSyncStatus("local");

    setSyncError(null);

  }, []);



  const applyOfflineLogin = useCallback((email: string, password: string) => {

    savePendingAuth(email, password);

    setToken(null);

    setUser({ id: "pending", email });

    setIsPendingAuth(true);

    persistAuth(null, null);

    setSyncStatus("local");

    setSyncError(null);

  }, []);



  const logout = useCallback(() => {

    setToken(null);

    setUser(null);

    setIsPendingAuth(false);

    persistAuth(null, null);

    clearPendingAuth();

    setSyncStatus("offline");

    setSyncError(null);

  }, []);



  const mergeFromCloud = useCallback(

    async (activeToken: string, targetAppKey = appKey): Promise<MergeResult> => {

      if (syncingRef.current) return "skipped";



      const remote = await fetchUserData(targetAppKey, activeToken);

      const localUpdated = getLocalUpdatedAt(targetAppKey);

      const localPayload = readLocalPayload(targetAppKey);

      const localEmpty = isPayloadEmpty(localPayload, targetAppKey);



      if (!remote) {

        if (localPayload !== null && !localEmpty) {

          const pushed = await pushUserData(targetAppKey, localPayload, activeToken);

          setLocalUpdatedAt(targetAppKey, new Date(pushed.updatedAt).getTime());

          clearPendingSync(targetAppKey);

          return "pushed";

        }

        clearPendingSync(targetAppKey);

        return "pending";

      }



      const remoteUpdated = new Date(remote.updatedAt).getTime();

      const remoteEmpty = isPayloadEmpty(remote.payload, targetAppKey);



      if (remoteEmpty && localEmpty) {

        clearPendingSync(targetAppKey);

        return "pending";

      }



      if (remoteEmpty && !localEmpty && localPayload !== null) {

        const pushed = await pushUserData(targetAppKey, localPayload, activeToken);

        setLocalUpdatedAt(targetAppKey, new Date(pushed.updatedAt).getTime());

        clearPendingSync(targetAppKey);

        return "pushed";

      }



      if (!remoteEmpty && localEmpty) {

        writeLocalPayload(targetAppKey, remote.payload);

        setLocalUpdatedAt(targetAppKey, remoteUpdated);

        if (targetAppKey === appKey) onRemoteDataRef.current(remote.payload);

        clearPendingSync(targetAppKey);

        return "pulled";

      }



      if (!remoteEmpty && !localEmpty) {

        if (
          targetAppKey === appKey &&
          shouldPreferRemoteDiary(targetAppKey, localPayload, remote.payload)
        ) {
          writeLocalPayload(targetAppKey, remote.payload);
          setLocalUpdatedAt(targetAppKey, remoteUpdated);
          onRemoteDataRef.current(remote.payload);
          clearPendingSync(targetAppKey);
          return "pulled";
        }

        if (targetAppKey === appKey && remoteUpdated > localUpdated) {

          writeLocalPayload(targetAppKey, remote.payload);

          setLocalUpdatedAt(targetAppKey, remoteUpdated);

          onRemoteDataRef.current(remote.payload);

          clearPendingSync(targetAppKey);

          return "pulled";

        }

        if (localUpdated > remoteUpdated && localPayload !== null) {

          const pushed = await pushUserData(targetAppKey, localPayload, activeToken);

          setLocalUpdatedAt(targetAppKey, new Date(pushed.updatedAt).getTime());

          clearPendingSync(targetAppKey);

          return "pushed";

        }

        clearPendingSync(targetAppKey);

        return "confirmed";

      }



      return "pending";

    },

    [appKey],

  );



  const flushAllPending = useCallback(

    async (activeToken: string) => {

      const atHome = await isHomeServerReachable(true);

      if (!atHome) {

        setSyncStatus("local");

        setSyncError(null);

        return;

      }



      if (syncingRef.current) return;

      syncingRef.current = true;

      setSyncStatus("syncing");

      setSyncError(null);



      try {

        clearHomeReachableCache();

        const mainResult = await mergeFromCloud(activeToken, appKey);

        setSyncStatus(statusFromMerge(mainResult));



        for (const key of readPendingSyncKeys()) {

          if (key === appKey) continue;

          await mergeFromCloud(activeToken, key);

        }

      } catch (err) {

        setSyncStatus("error");

        setSyncError(

          err instanceof Error

            ? `${err.message}（数据仍安全保存在本机）`

            : "同步失败（数据仍安全保存在本机）",

        );

      } finally {

        syncingRef.current = false;

      }

    },

    [appKey, mergeFromCloud],

  );



  const completePendingAuth = useCallback(

    async (silent = false): Promise<boolean> => {

      const pending = loadPendingAuth();

      if (!pending) return false;

      if (!(await isHomeServerReachable())) {

        if (!silent) {

          setSyncStatus("local");

          setSyncError("暂未连接家里服务器，数据仍安全保存在本机");

        }

        return false;

      }

      if (!silent) {

        setSyncStatus("syncing");

        setSyncError(null);

      }

      try {

        const result = await loginUser(pending.email, pending.password);

        applyAuth(result.token, result.user);

        await flushAllPending(result.token);

        return true;

      } catch (err) {

        if (!silent) {

          setSyncStatus("error");

          setSyncError(err instanceof Error ? err.message : "验证登录失败");

        }

        return false;

      }

    },

    [applyAuth, flushAllPending],

  );



  const login = useCallback(

    async (email: string, password: string) => {

      const trimmedEmail = email.trim();

      if (!(await isHomeServerReachable())) {

        applyOfflineLogin(trimmedEmail, password);

        return;

      }

      try {

        const result = await loginUser(trimmedEmail, password);

        applyAuth(result.token, result.user);

        void flushAllPending(result.token);

      } catch (err) {

        if (isNetworkFailure(err)) {

          applyOfflineLogin(trimmedEmail, password);

          return;

        }

        throw err;

      }

    },

    [applyAuth, applyOfflineLogin, flushAllPending],

  );



  const register = useCallback(

    async (email: string, password: string) => {

      if (!(await isHomeServerReachable())) {

        throw new Error("注册需要连接家里 Wi‑Fi，请连上后再试");

      }

      const result = await registerUser(email.trim(), password);

      applyAuth(result.token, result.user);

      void flushAllPending(result.token);

    },

    [applyAuth, flushAllPending],

  );



  const syncNow = useCallback(async () => {

    if (isPendingAuth || !token) {

      await completePendingAuth(false);

      return;

    }

    clearHomeReachableCache();

    await flushAllPending(token);

  }, [completePendingAuth, flushAllPending, isPendingAuth, token]);



  useEffect(() => {

    const tryConnect = async () => {

      if (await completePendingAuth(true)) return;

      if (token) void flushAllPending(token);

    };

    const id = window.setTimeout(() => void tryConnect(), STARTUP_DELAY_MS);

    return () => clearTimeout(id);

  }, [token, appKey, flushAllPending, completePendingAuth]);



  useEffect(() => {

    const retry = () => {

      if (typeof navigator !== "undefined" && !navigator.onLine) return;

      clearHomeReachableCache();

      if (isPendingAuth) {

        void completePendingAuth(true);

        return;

      }

      if (token) void flushAllPending(token);

    };

    window.addEventListener("online", retry);

    const onVisible = () => {

      if (document.visibilityState === "visible") retry();

    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {

      window.removeEventListener("online", retry);

      document.removeEventListener("visibilitychange", onVisible);

    };

  }, [token, isPendingAuth, flushAllPending, completePendingAuth]);



  const value = useMemo(

    () => ({

      user,

      token,

      isPendingAuth,

      syncStatus,

      syncError,

      login,

      register,

      logout,

      syncNow,

      reportBackupSuccess,

    }),

    [user, token, isPendingAuth, syncStatus, syncError, login, register, logout, syncNow, reportBackupSuccess],

  );



  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;

}



export function useSync() {

  const ctx = useContext(SyncContext);

  if (!ctx) throw new Error("useSync must be used within SyncProvider");

  return ctx;

}



/** 数据变更后写入本地；连家里 Wi‑Fi 且已登录时自动上传 */

export function useCloudPush(appKey: string, payload: unknown) {

  const { token, reportBackupSuccess } = useSync();

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);



  useEffect(() => {

    writeLocalPayload(appKey, payload);



    if (!token) return;

    if (isPayloadEmpty(payload, appKey)) return;



    touchLocalUpdatedAt(appKey);

    markPendingSync(appKey);



    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {

      void (async () => {

        try {

          if (!(await isHomeServerReachable())) return;

          if (isPayloadEmpty(payload, appKey)) return;

          const pushed = await pushUserData(appKey, payload, token);

          setLocalUpdatedAt(appKey, new Date(pushed.updatedAt).getTime());

          clearPendingSync(appKey);

          reportBackupSuccess();

        } catch {

          // 服务器不可达时保持「待备份」，连上 Wi‑Fi 后会自动重试

        }

      })();

    }, 800);



    return () => {

      if (timerRef.current) clearTimeout(timerRef.current);

    };

  }, [appKey, payload, token, reportBackupSuccess]);

}


