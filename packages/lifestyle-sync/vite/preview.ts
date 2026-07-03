import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lifestyleApiProxy } from "./apiProxy.ts";

export { lifestyleApiProxy };

const certDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../scripts/certs");
const certPath = path.join(certDir, "cert.pem");
const keyPath = path.join(certDir, "key.pem");

function loadHttpsOptions() {
  if (!existsSync(certPath) || !existsSync(keyPath)) return undefined;
  return {
    key: readFileSync(keyPath),
    cert: readFileSync(certPath),
  };
}

/** 生产预览：局域网 HTTPS（iPhone 离线 PWA 必需） */
export function lifestylePreview(port: number, strictPort = false) {
  const https = loadHttpsOptions();
  return { host: true, port, strictPort, ...(https ? { https } : {}) };
}

export function getLocalCertPaths() {
  return { certDir, certPath, keyPath };
}
