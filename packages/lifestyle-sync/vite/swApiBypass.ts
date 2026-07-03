import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const source = path.join(path.dirname(fileURLToPath(import.meta.url)), "sw-api-bypass.js");

/** 构建时复制 SW 补丁到各 App 的 public/，配合 workbox importScripts */
export function lifestyleSwApiBypass(): Plugin {
  return {
    name: "lifestyle-sw-api-bypass",
    configResolved(config) {
      const out = path.join(config.root, "public/sw-api-bypass.js");
      mkdirSync(path.dirname(out), { recursive: true });
      if (existsSync(source)) copyFileSync(source, out);
    },
  };
}
