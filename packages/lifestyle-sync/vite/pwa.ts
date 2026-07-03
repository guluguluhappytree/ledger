import { VitePWA, type VitePWAOptions } from "vite-plugin-pwa";
import { lifestyleAppleIcon } from "./appleIcon.ts";
import { lifestyleApiProxy } from "./apiProxy.ts";
import { lifestyleOfflineBoot } from "./offlineBoot.ts";
import { lifestyleSwApiBypass } from "./swApiBypass.ts";

const API_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

function apiNetworkOnlyRoutes() {
  return API_METHODS.map((method) => ({
    urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith("/api/"),
    handler: "NetworkOnly" as const,
    method,
  }));
}

type LifestylePwaOptions = {
  name: string;
  shortName: string;
  description: string;
  themeColor?: string;
  backgroundColor?: string;
  /** 独立 PWA 身份，避免与同源/缓存的其他 App 混淆 */
  manifestId?: string;
  /** Service Worker 缓存命名空间 */
  cacheId?: string;
};

type LifestylePwaPluginOptions = {
  /** 日记等 App 用 false：保持 ./icons/ 路径，与改图标前一致 */
  appleIcon?: boolean;
  /** 日记离线：先 SW 再加载 JS */
  offlineBoot?: boolean;
};

/** 离线预缓存 App 壳 + /api 强制走网络（云同步与离线两不耽误） */
export function lifestylePwa(options: LifestylePwaOptions, pluginOpts: LifestylePwaPluginOptions = {}) {
  const useAppleIcon = pluginOpts.appleIcon !== false;

  const includeAssets = [
    "icons/icon.svg",
    "icons/icon-192.png",
    "icons/icon-512.png",
    "icons/apple-touch-icon.png",
    "sw-api-bypass.js",
  ];
  if (useAppleIcon) {
    includeAssets.push("apple-touch-icon.png", "apple-touch-icon-precomposed.png");
  }

  const config: Partial<VitePWAOptions> = {
    registerType: "autoUpdate",
    injectRegister: "script-defer",
    includeAssets,
    manifest: {
      ...(options.manifestId ? { id: options.manifestId } : {}),
      name: options.name,
      short_name: options.shortName,
      description: options.description,
      theme_color: options.themeColor ?? "#ffffff",
      background_color: options.backgroundColor ?? "#ffffff",
      display: "standalone",
      orientation: "portrait",
      lang: "zh-CN",
      start_url: "./",
      scope: "./",
      icons: [
        { src: "icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
        { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
        { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    workbox: {
      ...(options.cacheId ? { cacheId: options.cacheId } : {}),
      globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest,woff2}"],
      navigateFallback: "index.html",
      navigateFallbackDenylist: [/^\/api\//],
      importScripts: ["sw-api-bypass.js"],
      runtimeCaching: apiNetworkOnlyRoutes(),
      cleanupOutdatedCaches: true,
      skipWaiting: true,
      clientsClaim: true,
      navigationPreload: false,
    },
    devOptions: {
      enabled: false,
    },
  };

  return VitePWA(config);
}

export function lifestylePwaPlugins(options: LifestylePwaOptions, pluginOpts: LifestylePwaPluginOptions = {}) {
  const plugins = [lifestyleSwApiBypass(), lifestyleApiProxy(), lifestylePwa(options, pluginOpts)];
  if (pluginOpts.appleIcon !== false) {
    plugins.splice(1, 0, lifestyleAppleIcon());
  }
  if (pluginOpts.offlineBoot) {
    plugins.push(lifestyleOfflineBoot());
  }
  return plugins;
}
