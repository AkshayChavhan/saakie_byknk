/**
 * Delivery-time watermarking for product photography.
 *
 * The mark is the Saakie_by KNK logo, stored in Cloudinary as an overlay
 * asset (see scripts/upload-watermark.mjs) and composed onto every photo by
 * the CDN. Two consequences matter:
 *
 *  1. The work happens at the CDN, so the file a visitor downloads (or a
 *     scraper curls) already has the logo burned into its pixels. There is no
 *     client-side step to disable and no un-marked copy cached in the browser.
 *  2. This is applied in the API layer and the server loaders, not in
 *     components, so the clean URL never reaches the browser at all.
 *
 * Two kinds of source are handled:
 *
 *  - Photos uploaded to Cloudinary. Their delivery URLs are shaped
 *      https://res.cloudinary.com/<cloud>/image/upload/[<transforms>/]v<n>/<id>.<ext>
 *    and the overlay is spliced in as a transformation after `/upload/`.
 *  - Photos hosted elsewhere (the Unsplash/Pexels demo catalogue). Cloudinary
 *    can fetch a remote image and transform it on the way through, so those
 *    are rewritten to
 *      https://res.cloudinary.com/<cloud>/image/fetch/<transforms>/<encoded remote url>
 *    which needs the cloud name (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME).
 *
 * Local files (`/images/placeholder-*.svg`) are not product photos and pass
 * through. The feature is on unless WATERMARK_ENABLED is set to "false".
 *
 * The remote (fetch) path is opt-in: WATERMARK_FETCH_REMOTE=true. Cloudinary
 * accounts restrict fetched images by default and answer 401, which would
 * show as broken demo photos, so the rewrite only happens once the account
 * setting is known to be on (Settings → Security → Restricted image types).
 */

const UPLOAD_MARKER = '/image/upload/';
const FETCH_MARKER = '/image/fetch/';

/** Cloudinary public id of the overlay asset uploaded by scripts/upload-watermark.mjs. */
export const DEFAULT_WATERMARK_PUBLIC_ID = 'saakie-byknk/watermark';

/**
 * Read at call time rather than module scope so the flag can be flipped per
 * environment (and stubbed in tests) without re-importing the module.
 */
function watermarkEnabled(): boolean {
  return process.env.WATERMARK_ENABLED !== 'false';
}

function fetchRemoteEnabled(): boolean {
  return process.env.WATERMARK_FETCH_REMOTE === 'true';
}

function cloudName(): string | undefined {
  return process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || undefined;
}

/** Cloudinary writes folder separators in a layer id as `:`, not `/`. */
function layerId(): string {
  return (process.env.WATERMARK_PUBLIC_ID || DEFAULT_WATERMARK_PUBLIC_ID).replace(/\//g, ':');
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
 * Returns `url` with the logo watermark applied, or `url` unchanged when it
 * is not a photo we can mark (local file, data URL, already marked) or the
 * feature is switched off.
 */
export function watermarkImageUrl(url: string, options: WatermarkOptions = {}): string {
  if (!url) return url;
  if (!watermarkEnabled()) return url;

  // Guard against a caller applying this twice and stacking overlays.
  if (url.includes(`l_${layerId()}`) || url.includes(FETCH_MARKER)) return url;

  const overlay = overlayTransform(options);

  const markerAt = url.indexOf(UPLOAD_MARKER);
  if (markerAt !== -1) {
    const head = url.slice(0, markerAt + UPLOAD_MARKER.length);
    const tail = url.slice(markerAt + UPLOAD_MARKER.length);
    return `${head}${overlay}/${tail}`;
  }

  // A remote photo: route it through Cloudinary's fetch delivery.
  if (fetchRemoteEnabled() && /^https?:\/\//i.test(url)) {
    const cloud = cloudName();
    if (!cloud) return url;
    return `https://res.cloudinary.com/${cloud}${FETCH_MARKER}${overlay}/${encodeURIComponent(url)}`;
  }

  return url;
}
