import type { Plugin } from "vite";

/**
 * iOS 离线 PWA 启动器：
 * - 已有 SW 控制页面 → 直接加载 App（断网时不再 register，避免 iOS 白屏）
 * - 在线且无 SW → 注册后再加载
 * - 离线且无 SW → 显示说明，不要白屏
 */
export function lifestyleOfflineBoot(): Plugin {
  return {
    name: "lifestyle-offline-boot",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        let next = html.replace(/\s+crossorigin/g, "");

        next = next.replace(/<script id="vite-plugin-pwa:register-sw"[^>]*><\/script>\s*/g, "");
        next = next.replace(/<script src="\.\/registerSW\.js"[^>]*><\/script>\s*/g, "");

        const moduleMatch =
          next.match(/<script type="module" crossorigin src="(\.\/assets\/[^"]+\.js)"><\/script>/) ??
          next.match(/<script type="module" src="(\.\/assets\/[^"]+\.js)"><\/script>/);
        if (!moduleMatch) return next;

        const moduleSrc = moduleMatch[1];
        next = next.replace(/<script type="module"[^>]*src="\.\/assets\/[^"]+\.js"[^>]*><\/script>\s*/g, "");

        const bootScript = `
    <script>
      (function () {
        var MODULE = "${moduleSrc}";
        var root = document.getElementById("root");
        function showHelp(msg) {
          if (!root) return;
          root.innerHTML =
            '<div class="boot-loading">' +
            '<div class="boot-loading__title">日记</div>' +
            '<div class="boot-loading__hint" style="max-width:320px;text-align:center;line-height:1.6;padding:0 20px">' +
            msg +
            "</div></div>";
        }
        function loadApp() {
          var s = document.createElement("script");
          s.type = "module";
          s.src = MODULE;
          s.onerror = function () {
            showHelp("应用加载失败。请连 Wi‑Fi 打开 https 地址，等界面出现后再「添加到主屏幕」。");
          };
          document.body.appendChild(s);
        }
        function start() {
          if (!("serviceWorker" in navigator)) {
            loadApp();
            return;
          }
          if (navigator.serviceWorker.controller) {
            loadApp();
            return;
          }
          if (!navigator.onLine) {
            showHelp(
              "离线缓存尚未准备好。<br><br>请先连 Wi‑Fi，Safari 打开 https://192.168.1.4:5175/ ，等日记界面完全出现，再「添加到主屏幕」。"
            );
            return;
          }
          navigator.serviceWorker
            .register("./sw.js", { scope: "./" })
            .then(function (reg) {
              if (navigator.serviceWorker.controller) {
                loadApp();
                return;
              }
              var done = false;
              var finish = function () {
                if (done) return;
                done = true;
                loadApp();
              };
              navigator.serviceWorker.addEventListener("controllerchange", finish, { once: true });
              if (reg.active) finish();
              else if (reg.installing) {
                reg.installing.addEventListener("statechange", function () {
                  if (reg.installing && reg.installing.state === "activated") finish();
                });
              } else if (reg.waiting) finish();
              setTimeout(finish, 3000);
            })
            .catch(function () {
              loadApp();
            });
        }
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", start);
        } else {
          start();
        }
      })();
    </script>`;

        if (!next.includes("serviceWorker.controller")) {
          next = next.replace("</body>", `${bootScript}\n  </body>`);
        }

        return next;
      },
    },
  };
}
