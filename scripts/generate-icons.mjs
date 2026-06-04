// One-off PWA icon generator. Run once with: `node scripts/generate-icons.mjs`
//
// The brand logo (public/images/saakie.jpg) is a 1080x1080 square image with no
// alpha channel. Each icon is produced by centering the logo (resized with
// `fit: contain`) onto a square brand near-black (#161616) canvas. The maskable
// icon keeps the logo inside the safe circle (~70% of the tile) so platforms that
// crop to a circle never clip it.
//
// `sharp` ships transitively with Next.js, so no extra dependency is required.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const SRC = 'public/images/saakie.jpg';
const ICONS_DIR = 'public/icons';
const BG = { r: 0x16, g: 0x16, b: 0x16, alpha: 1 }; // brand near-black #161616

await mkdir(ICONS_DIR, { recursive: true });

// Place the logo, scaled to `logoFraction` of the tile, centered on a square BG.
async function squareIcon(size, logoFraction, outPath) {
  const inner = Math.round(size * logoFraction);
  const logo = await sharp(SRC)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

// Manifest icons (referenced from app/manifest.ts via /icons/*).
await squareIcon(192, 0.92, `${ICONS_DIR}/icon-192.png`);
await squareIcon(512, 0.92, `${ICONS_DIR}/icon-512.png`);
// Maskable: content within the ~70% safe circle.
await squareIcon(512, 0.7, `${ICONS_DIR}/maskable-512.png`);
// Apple touch icon (Apple applies its own rounding).
await squareIcon(180, 0.86, `${ICONS_DIR}/apple-icon-180.png`);

// Next.js file-convention head icons. These let Next inject the correct
// <link rel="icon"> / apple-touch-icon tags automatically from app/.
await squareIcon(512, 0.92, 'app/icon.png');
await squareIcon(180, 0.86, 'app/apple-icon.png');

console.log('Generated PWA icons in public/icons/, app/icon.png, app/apple-icon.png');
