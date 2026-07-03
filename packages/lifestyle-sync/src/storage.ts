import { isPayloadEmpty } from "shared";

function updatedAtKey(appKey: string) {
  return `${appKey}:cloud-updated-at`;
}

export function getLocalUpdatedAt(appKey: string): number {
  return Number(localStorage.getItem(updatedAtKey(appKey)) || 0);
}

export function setLocalUpdatedAt(appKey: string, ms: number) {
  localStorage.setItem(updatedAtKey(appKey), String(ms));
}

export function touchLocalUpdatedAt(appKey: string, ms = Date.now()) {
  setLocalUpdatedAt(appKey, ms);
}

export function readLocalPayload(appKey: string): unknown | null {
  const raw = localStorage.getItem(appKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

/** 仅写入 localStorage，不更新 cloud-updated-at（避免空数据刷新时间戳盖过云端） */
export function writeLocalPayload(appKey: string, payload: unknown) {
  localStorage.setItem(appKey, JSON.stringify(payload));
}

export { isPayloadEmpty };
