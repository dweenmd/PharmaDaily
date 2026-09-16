/**
 * Generates the PWA icon set from an inline SVG.
 *
 *     npx tsx scripts/generate-icons.ts
 *
 * Committed as a script rather than as opaque binaries so the icons can be
 * regenerated or restyled without a design tool. Re-run it after changing the
 * mark below.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const OUT_DIR = path.join(process.cwd(), "public", "icons");

const BRAND = "#0f172a";
const ACCENT = "#ffffff";

/**
 * @param padding fraction of the canvas left empty around the mark. Maskable
 * icons need a safe zone, because the launcher crops them to its own shape.
 */
function pillSvg(size: number, padding: number, rounded: boolean) {
  const inset = size * padding;
  const inner = size - inset * 2;
  const radius = rounded ? size * 0.22 : 0;
  const stroke = Math.max(2, inner * 0.09);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${BRAND}"/>
  <g transform="translate(${inset} ${inset})">
    <g transform="rotate(-45 ${inner / 2} ${inner / 2})">
      <rect x="${inner * 0.16}" y="${inner * 0.3}"
            width="${inner * 0.68}" height="${inner * 0.4}"
            rx="${inner * 0.2}"
            fill="none" stroke="${ACCENT}" stroke-width="${stroke}"/>
      <line x1="${inner * 0.5}" y1="${inner * 0.3}"
            x2="${inner * 0.5}" y2="${inner * 0.7}"
            stroke="${ACCENT}" stroke-width="${stroke}"/>
    </g>
  </g>
</svg>`.trim();
}

const TARGETS = [
  { file: "icon-192.png", size: 192, padding: 0.2, rounded: true },
  { file: "icon-512.png", size: 512, padding: 0.2, rounded: true },
  // Maskable: no rounding (the launcher applies its own) and a wider safe zone.
  { file: "icon-maskable-512.png", size: 512, padding: 0.3, rounded: false },
  { file: "apple-touch-icon.png", size: 180, padding: 0.18, rounded: false },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  for (const { file, size, padding, rounded } of TARGETS) {
    const svg = pillSvg(size, padding, rounded);
    const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
    await writeFile(path.join(OUT_DIR, file), png);
    console.log(`  ${file}  ${size}x${size}`);
  }

  // Keep a vector copy for favicons and anywhere a crisp scalable mark helps.
  await writeFile(path.join(OUT_DIR, "icon.svg"), pillSvg(512, 0.2, true), "utf8");
  console.log("  icon.svg");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
