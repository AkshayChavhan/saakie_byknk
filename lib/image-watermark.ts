/**
 * Delivery-time watermarking for product photography uploaded from the
 * cutover date onwards.
 *
 * The mark is the Saakie_by KNK logo, stored in Cloudinary as an overlay
 * asset (see scripts/upload-watermark.mjs) and composed onto a photo by the
 * CDN. Two consequences matter:
 *
 *  1. The work happens at the CDN, so the file a visitor downloads (or a
 *     scraper curls) already has the logo burned into its pixels. There is no
 *     client-side step to disable and no un-marked copy cached in the browser.
 *  2. This is applied in the API layer and the server loaders, not in
 *     components, so the clean URL never reaches the browser at all.
 *
 * Cloudinary delivery URLs are shaped
 *   https://res.cloudinary.com/<cloud>/image/upload/[<transforms>/]v<n>/<id>.<ext>
 * and `v<n>` is the upload time in Unix seconds. Only photos uploaded on or
 * after WATERMARK_SINCE are marked; everything older — the catalogue as it
 * was before the mark was introduced, and the Unsplash/Pexels demo photos,
 * which are not on Cloudinary at all — is delivered as it is. Re-uploading a
 * photo through the admin gives it a new version and therefore the mark.
 *
 * The feature is on unless WATERMARK_ENABLED is set to "false".
 */

const UPLOAD_MARKER = '/image/upload/';

/** Cloudinary public id of the overlay asset uploaded by scripts/upload-watermark.mjs. */
export const DEFAULT_WATERMARK_PUBLIC_ID = 'saakie-byknk/watermark';

/**
 * Cutover: photos uploaded from this moment on carry the mark. ISO date, or
 * Unix seconds, in WATERMARK_SINCE; this default is the day the logo was
 * introduced to the store.
 */
export const DEFAULT_WATERMARK_SINCE = '2026-10-19T00:00:00Z';

/**
 * Read at call time rather than module scope so the flags can be set per
 * environment (and stubbed in tests) without re-importing the module.
 */
function watermarkEnabled(): boolean {
  return process.env.WATERMARK_ENABLED !== 'false';
}

/** The cutover as Unix seconds. An unparseable value falls back to the default. */
export function watermarkSinceSeconds(): number {
  const raw = (process.env.WATERMARK_SINCE || '').trim();
  if (/^\d{9,}$/.test(raw)) return Number(raw);
  const parsed = Date.parse(raw || DEFAULT_WATERMARK_SINCE);
  return Math.floor((Number.isNaN(parsed) ? Date.parse(DEFAULT_WATERMARK_SINCE) : parsed) / 1000);
}

/** Cloudinary writes folder separators in a layer id as `:`, not `/`. */
function layerId(): string {
  return (process.env.WATERMARK_PUBLIC_ID || DEFAULT_WATERMARK_PUBLIC_ID).replace(/\//g, ':');
}

/** The `v<n>` upload version in a Cloudinary URL, or null when there is none. */
export function cloudinaryVersion(url: string): number | null {
  const match = url.match(/\/v(\d+)\//);
  return match ? Number(match[1]) : null;
}

export interface WatermarkOptions {
  /** Overlay width as a fraction of the base image width (0–1). */
  scale?: number;
  /** Overlay opacity, 0–100. */
  opacity?: number;
}

function overlayTransform({ scale = 0.7, opacity = 55 }: WatermarkOptions): string {
  // `fl_relative` + `w_<fraction>` scales the logo to the delivered width, so
  // the mark covers the same proportion of a 320px thumbnail and a 2000px
  // zoom. A fixed size would be invisible on one and overwhelming on the other.
  return [`l_${layerId()}`, `o_${opacity}`, 'g_center', 'fl_relative', `w_${scale}`].join(',');
}

/**
 * Returns `url` with the logo watermark applied when it is a Cloudinary photo
 * uploaded on or after the cutover; otherwise `url` unchanged.
 */
export function watermarkImageUrl(url: string, options: WatermarkOptions = {}): string {
  if (!url) return url;
  if (!watermarkEnabled()) return url;

  const markerAt = url.indexOf(UPLOAD_MARKER);
  if (markerAt === -1) return url;

  // Guard against a caller applying this twice and stacking overlays.
  if (url.includes(`l_${layerId()}`)) return url;

  // Older photos, and URLs without a version (whose age is unknown), stay as
  // they are.
  const version = cloudinaryVersion(url);
  if (version === null || version < watermarkSinceSeconds()) return url;

  const head = url.slice(0, markerAt + UPLOAD_MARKER.length);
  const tail = url.slice(markerAt + UPLOAD_MARKER.length);
  return `${head}${overlayTransform(options)}/${tail}`;
}
