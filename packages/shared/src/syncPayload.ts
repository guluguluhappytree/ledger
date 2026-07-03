const APP_KEYS = {
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

type KnownAppKey = (typeof APP_KEYS)[keyof typeof APP_KEYS];

function len(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function isDiaryEmpty(obj: Record<string, unknown>): boolean {
  return len(obj.entries) === 0 && len(obj.reviews) === 0 && len(obj.photos) === 0;
}

function isVirtueEmpty(obj: Record<string, unknown>): boolean {
  return len(obj.habits) === 0 && len(obj.weekHistory) === 0;
}

function isLedgerEmpty(obj: Record<string, unknown>): boolean {
  const settings = obj.settings;
  const setupComplete =
    settings && typeof settings === "object" && (settings as Record<string, unknown>).setupComplete === true;
  return len(obj.transactions) === 0 && !setupComplete;
}

function isIpBuilderEmpty(obj: Record<string, unknown>): boolean {
  return len(obj.completedTaskIds) === 0 && (obj.kickstartStartedAt === null || obj.kickstartStartedAt === undefined);
}

function isListEmpty(obj: Record<string, unknown>, key: string): boolean {
  return len(obj[key]) === 0;
}

const APP_EMPTY_CHECKS: Partial<Record<KnownAppKey, (obj: Record<string, unknown>) => boolean>> = {
  [APP_KEYS.diary]: isDiaryEmpty,
  [APP_KEYS.virtueTracker]: isVirtueEmpty,
  [APP_KEYS.ledger]: isLedgerEmpty,
  [APP_KEYS.notes]: (obj) => isListEmpty(obj, "notes") && isListEmpty(obj, "articles"),
  [APP_KEYS.copywriter]: (obj) => isListEmpty(obj, "copies"),
  [APP_KEYS.readingList]: (obj) => isListEmpty(obj, "goals"),
  [APP_KEYS.bucketList]: (obj) => isListEmpty(obj, "items"),
  [APP_KEYS.memos]: (obj) => isListEmpty(obj, "items"),
  [APP_KEYS.ipBuilder]: isIpBuilderEmpty,
  [APP_KEYS.channel]: (obj) => isListEmpty(obj, "items") && isListEmpty(obj, "posts"),
};

function isGenericObjectEmpty(obj: Record<string, unknown>): boolean {
  const values = Object.values(obj);
  if (values.length === 0) return true;
  return values.every((value) => {
    if (value === null || value === undefined || value === "") return true;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === "object") return isPayloadEmpty(value);
    return false;
  });
}

/** 判断 App 同步 payload 是否实质为空（防止空本地覆盖云端备份） */
export function isPayloadEmpty(payload: unknown, appKey?: string): boolean {
  if (payload === null || payload === undefined) return true;
  if (Array.isArray(payload)) return payload.length === 0;
  if (typeof payload !== "object") return false;

  const obj = payload as Record<string, unknown>;
  if (appKey && appKey in APP_EMPTY_CHECKS) {
    return APP_EMPTY_CHECKS[appKey as KnownAppKey]!(obj);
  }

  return isGenericObjectEmpty(obj);
}
