import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "public/icons/icon.svg"));

async function main() {
  const sharp = (await import("sharp")).default;
  for (const [name, size] of [["icon-192.png", 192], ["icon-512.png", 512], ["apple-touch-icon.png", 180]]) {
    const out = join(root, "public/icons", name);
    mkdirSync(dirname(out), { recursive: true });
    await sharp(svg).resize(size, size).png().toFile(out);
    console.log("✓", out);
  }
}
main();
