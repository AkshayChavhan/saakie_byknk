// Upload the Saakie_by KNK logo to Cloudinary as the product-photo watermark.
//
//   node scripts/upload-watermark.mjs                       -> assets/branding/saakie-watermark.png
//   node scripts/upload-watermark.mjs path/to/other.png     -> a different source file
//
// Run once per Cloudinary account (and again whenever the logo changes). The
// asset is stored under the public id lib/image-watermark.ts expects
// (WATERMARK_PUBLIC_ID, default "saakie-byknk/watermark") and overwritten in
// place, so every product URL picks up the new logo on the next request.
//
// The source PNG is large and mostly transparent, so it is trimmed to its
// visible bounds and limited to 1600px on upload; the CDN composes it onto
// photos at a fraction of their width anyway (fl_relative, w_0.7).
//
// Reads CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
// from .env.local / .env.
import { v2 as cloudinary } from 'cloudinary';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function readEnv(key) {
  for (const file of ['.env.local', '.env']) {
    if (!existsSync(file)) continue;
    for (const raw of readFileSync(file, 'utf8').split('\n')) {
      const line = raw.trim();
      if (line.startsWith('#') || !line.startsWith(`${key}=`)) continue;
      return line.slice(key.length + 1).replace(/^["']|["']$/g, '');
    }
  }
  return process.env[key];
}

const cloud_name = readEnv('CLOUDINARY_CLOUD_NAME');
const api_key = readEnv('CLOUDINARY_API_KEY');
const api_secret = readEnv('CLOUDINARY_API_SECRET');
if (!cloud_name || !api_key || !api_secret) {
  console.error('CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET must be set');
  process.exit(1);
}
cloudinary.config({ cloud_name, api_key, api_secret });

const publicId = readEnv('WATERMARK_PUBLIC_ID') || 'saakie-byknk/watermark';
const source = resolve(process.argv[2] || 'assets/branding/saakie-watermark.png');
if (!existsSync(source)) {
  console.error(`Source file not found: ${source}`);
  process.exit(1);
}

const result = await cloudinary.uploader.upload(source, {
  public_id: publicId,
  overwrite: true,
  invalidate: true,
  resource_type: 'image',
  // Incoming transformation: trim the transparent border, cap the size, and
  // keep the PNG's alpha so the photo shows through.
  transformation: [{ effect: 'trim' }, { width: 1600, crop: 'limit' }, { format: 'png' }],
});

console.log(`Uploaded ${source}`);
console.log(`  public id : ${result.public_id}`);
console.log(`  size      : ${result.width}x${result.height}, ${Math.round(result.bytes / 1024)} KB`);
console.log(`  url       : ${result.secure_url}`);
console.log('Product photos will carry the mark on their next request.');
