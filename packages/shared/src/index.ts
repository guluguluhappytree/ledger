/** 跨 apps 共享的常量与类型（避免 web 直接依赖 database） */
export const API_PREFIX = "/api/v1";

export type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: unknown } };

/** Lifestyle 小应用 localStorage 命名空间（与云端 appKey 一致） */
export const LIFESTYLE_APP_KEYS = {
  virtueTracker: "virtue-tracker-state-v1",
  diary: "diary-app-v1",
  ledger: "ledger-app-v1",
  notes: "notes-app-v1",
  copywriter: "copywriter-app-v1",
  readingList: "reading-list-app-v1",
  ipBuilder: "ip-builder-app-v1",
  bucketList: "bucket-list-app-v1",
  memos: "memos-app-v1",
  channel: "channel-app-v1",
} as const;

export type LifestyleAppKey = (typeof LIFESTYLE_APP_KEYS)[keyof typeof LIFESTYLE_APP_KEYS];

export type AuthUser = { id: string; email: string };

export type UserDataSnapshot = {
  appKey: string;
  payload: unknown;
  updatedAt: string;
};

export { isPayloadEmpty } from "./syncPayload.js";
