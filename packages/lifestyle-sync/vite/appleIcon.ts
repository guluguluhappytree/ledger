import { copyFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

/**
 * iOS「添加到主屏幕」在自签 HTTPS 下常无法拉取 apple-touch-icon.png，
 * 构建时内联为 data URL，并复制到站点根目录供 SW 预缓存。
 */
export function lifestyleAppleIcon(): Plugin {
  let root = "";
  let outDir = "";
  let dataUrl = "";

  return {
    name: "lifestyle-apple-icon",
    apply: "build",
    configResolved(config) {
      root = config.root;
      outDir = path.resolve(root, config.build.outDir);
      const pngPath = path.join(root, "public/icons/apple-touch-icon.png");
      if (existsSync(pngPath)) {
        dataUrl = `data:image/png;base64,${readFileSync(pngPath).toString("base64")}`;
      }
    },
    transformIndexHtml: {
      order: "post",
      handler(html) {
        if (!dataUrl) return html;

        let next = html.replace(/<link rel="apple-touch-icon[^"]*"[^>]*>\s*/g, "");
        next = next.replace(/<link rel="apple-touch-icon-precomposed[^"]*"[^>]*>\s*/g, "");

        const tags = `
    <link rel="apple-touch-icon" sizes="180x180" href="${dataUrl}" />
    <link rel="apple-touch-icon-precomposed" sizes="180x180" href="${dataUrl}" />`;

        return next.replace("<head>", `<head>${tags}`);
      },
    },
    writeBundle() {
      const pngPath = path.join(root, "public/icons/apple-touch-icon.png");
      if (!existsSync(pngPath)) return;

      copyFileSync(pngPath, path.join(outDir, "apple-touch-icon.png"));
      copyFileSync(pngPath, path.join(outDir, "apple-touch-icon-precomposed.png"));
    },
  };
}
