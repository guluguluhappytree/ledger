import path from "node:path";

/** monorepo 根目录 .env，供 NEXT_PUBLIC_* / VITE_* 共用 */
export function lifestyleEnvDir(appRoot: string) {
  return path.resolve(appRoot, "../..");
}

export const lifestyleEnvPrefix = ["VITE_", "NEXT_PUBLIC_"] as const;
