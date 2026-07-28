/**
 * Delivery-time watermarking for product photography.
 *
 * Cloudinary delivery URLs are shaped:
 *   https://res.cloudinary.com/<cloud>/image/upload/[<transforms>/]v<n>/<public-id>.<ext>
 *
 * A watermark is just another transformation, so it is applied by splicing a
 * text-overlay component in after `/upload/`. Two consequences matter:
 *
 *  1. The work happens at the CDN, so the file a visitor downloads (or a scraper
 *     curls) already has the mark burned into its pixels. There is no client-side
 *     step to disable and no un-marked copy cached in the browser.
 *  2. This must be applied in the API layer, not in components. The point is that
 *     the clean URL never reaches the browser at all — if a component did the
 *     splicing, the original URL would still be sitting in the JSON payload.
 *
 * Note this is pure string work against a public URL — no API secret involved —
 * so it is safe to import from client code too, though the API layer is the
 * correct place.
 */

const UPLOAD_MARKER = '/image/upload/';

export const WATERMARK_TEXT = 'owned by saakiebyknk';

/**
 * Cloudinary parses `,` and `/` as transformation separators, so a literal one
 * inside overlay text has to survive as a double-encoded sequence.
 */
function encodeOverlayText(text: string): string {
  return encodeURIComponent(text)
    .replace(/%2C/gi, '%252C')
    .replace(/%2F/gi, '%252F');
}

export interface WatermarkOptions {
  text?: string;
  /** Overlay width as a fraction of the base image width (0–1). */
  scale?: number;
  /** Overlay opacity, 0–100. */
  opacity?: number;
}

/**
 * Returns `url` with an ownership watermark applied.
 *
 * Non-Cloudinary sources (local placeholder SVGs, the Unsplash/Pexels demo
 * photos) are returned untouched — they are not ours to mark.
 */
export function watermarkImageUrl(
  url: string,
  options: WatermarkOptions = {}
): string {
  if (!url) return url;

  const markerAt = url.indexOf(UPLOAD_MARKER);
  if (markerAt === -1) return url;

  // Guard against a caller applying this twice and stacking overlays.
  if (url.includes('l_text:')) return url;

  const { text = WATERMARK_TEXT, scale = 0.72, opacity = 38 } = options;

  // `fl_relative` + `w_<fraction>` scales the text to the delivered width, so
  // the mark covers the same proportion of a 320px thumbnail and a 2000px zoom.
  // A fixed font size would be illegible on one and overwhelming on the other.
  const overlay = [
    `l_text:Arial_50_bold:${encodeOverlayText(text)}`,
    'co_rgb:ffffff',
    `o_${opacity}`,
    'a_-30',
    'g_center',
    'fl_relative',
    `w_${scale}`,
  ].join(',');

  const head = url.slice(0, markerAt + UPLOAD_MARKER.length);
  const tail = url.slice(markerAt + UPLOAD_MARKER.length);
  return `${head}${overlay}/${tail}`;
}
