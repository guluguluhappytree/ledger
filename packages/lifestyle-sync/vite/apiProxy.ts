import { existsSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { IncomingMessage } from "node:http";
import type { Plugin } from "vite";

const certDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../scripts/certs");
const certPath = path.join(certDir, "cert.pem");

function apiTarget() {
  return existsSync(certPath) ? "https://127.0.0.1:4000" : "http://127.0.0.1:4000";
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function filterResponseHeaders(headers: http.IncomingHttpHeaders) {
  const next: http.OutgoingHttpHeaders = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    const lower = key.toLowerCase();
    if (lower === "transfer-encoding" || lower === "connection") continue;
    next[key] = value;
  }
  return next;
}

/** preview 模式下把 /api 转发到本机 4000，供手机同源访问云同步 */
export function lifestyleApiProxy(): Plugin {
  const middleware = async (
    req: IncomingMessage,
    res: http.ServerResponse,
    next: (err?: unknown) => void,
  ) => {
    const url = req.url ?? "";
    if (!url.startsWith("/api")) return next();

    try {
      const body = req.method === "GET" || req.method === "HEAD" ? undefined : await readBody(req);
      const target = new URL(apiTarget());
      const lib = target.protocol === "https:" ? https : http;

      const headers: http.OutgoingHttpHeaders = { ...req.headers, host: target.host };
      if (body) {
        headers["content-length"] = String(body.length);
      }

      const proxyReq = lib.request(
        {
          hostname: target.hostname,
          port: target.port,
          path: url,
          method: req.method,
          headers,
          rejectUnauthorized: false,
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode ?? 502, filterResponseHeaders(proxyRes.headers));
          proxyRes.pipe(res);
        },
      );

      proxyReq.on("error", () => {
        if (!res.headersSent) {
          res.statusCode = 502;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(
            JSON.stringify({
              success: false,
              error: { code: "API_PROXY", message: "云同步 API 未启动，请运行 npm run dev:api" },
            }),
          );
        }
      });

      if (body) proxyReq.write(body);
      proxyReq.end();
    } catch {
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(
          JSON.stringify({
            success: false,
            error: { code: "API_PROXY", message: "云同步代理异常" },
          }),
        );
      }
    }
  };

  return {
    name: "lifestyle-api-proxy",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
