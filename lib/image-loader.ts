/**
 * Image loader for next/image (wired in next.config.mjs as `loaderFile`).
 *
 * Every product, category and hero photo already lives on Cloudinary, which
 * resizes and re-encodes images at its own CDN. The default loader sent each
 * one through the hosting platform's image optimizer instead: the server
 * downloaded the photo from Cloudinary, resized it, encoded AVIF/WebP and
 * cached the result, once per photo per width. This loader asks Cloudinary
 * for the size directly, so the browser downloads from Cloudinary and the
 * site's server never handles image bytes.
 *
 * Cloudinary URLs get two chained steps around whatever is already there
 * (the watermark overlay, see lib/image-watermark.ts):
 *
 *   /image/upload/c_limit,w_640/<existing steps>/f_auto,q_auto/v123/id.jpg
 *
 *   - `c_limit,w_<n>` first: shrink to the requested width, never enlarge.
 *     The watermark that follows is sized relative to this resized photo.
 *   - `f_auto,q_auto` last: the best format the browser accepts (AVIF, WebP
 *     or JPEG) at a quality Cloudinary picks per image, or `q_<n>` when the
 *     component asks for a specific quality.
 *
 * Images that are not on Cloudinary use their own host's resize parameter
 * (Unsplash and Pexels demo photos, Clerk profile pictures). The few local
 * files in /public are small and are served as they are. Every branch puts
 * the width in the URL, because next/image warns about a loader that ignores
 * it.
 */

interface LoaderArgs {
  src: string
  width: number
  quality?: number
}

const CLOUDINARY_HOST = 'res.cloudinary.com'
const DELIVERY_MARKERS = ['/image/upload/', '/image/fetch/']

/** A Cloudinary transformation component, e.g. `w_640` or `l_logo,o_55,g_center`. */
const TRANSFORM_COMPONENT = /^[a-z]{1,3}_[^/,]+(,[a-z]{1,3}_[^/,]+)*$/
/** The `v<digits>` version segment that ends the transformations. */
const VERSION_SEGMENT = /^v\d+$/

function cloudinaryUrl(src: string, width: number, quality?: number): string | null {
  const marker = DELIVERY_MARKERS.find((m) => src.includes(m))
  if (!marker) return null

  const markerEnd = src.indexOf(marker) + marker.length
  const head = src.slice(0, markerEnd)
  const segments = src.slice(markerEnd).split('/')

  // Transformations sit between the marker and the version (`v123`). Without
  // a version, take the leading segments that look like transformations; a
  // fetch URL's remote address starts with `https:` and never matches.
  const versionAt = segments.findIndex((s) => VERSION_SEGMENT.test(s))
  let transformCount = 0
  if (versionAt !== -1) {
    transformCount = versionAt
  } else {
    while (transformCount < segments.length - 1 && TRANSFORM_COMPONENT.test(segments[transformCount])) {
      transformCount++
    }
  }

  const existing = segments.slice(0, transformCount)
  const rest = segments.slice(transformCount)
  const finish = `f_auto,${quality ? `q_${quality}` : 'q_auto'}`

  return `${head}${[`c_limit,w_${width}`, ...existing, finish, ...rest].join('/')}`
}

/** Set `w`, keeping the aspect ratio when the URL also pins a height. */
function scaledWidthParams(url: URL, width: number, widthKey: string, heightKey?: string) {
  const oldWidth = Number(url.searchParams.get(widthKey))
  const oldHeight = heightKey ? Number(url.searchParams.get(heightKey)) : NaN
  url.searchParams.set(widthKey, String(width))
  if (heightKey && oldWidth > 0 && oldHeight > 0) {
    url.searchParams.set(heightKey, String(Math.round((oldHeight * width) / oldWidth)))
  }
}

export default function imageLoader({ src, width, quality }: LoaderArgs): string {
  // Local files in /public: small, served as they are. The query string is
  // ignored by the static file server and keeps each width's URL distinct.
  if (src.startsWith('/')) {
    return `${src}${src.includes('?') ? '&' : '?'}w=${width}`
  }

  let url: URL
  try {
    url = new URL(src)
  } catch {
    return src
  }

  if (url.hostname === CLOUDINARY_HOST) {
    const resized = cloudinaryUrl(src, width, quality)
    if (resized) return resized
  }

  switch (url.hostname) {
    case 'images.unsplash.com':
      scaledWidthParams(url, width, 'w', 'h')
      url.searchParams.set('auto', 'format')
      if (quality) url.searchParams.set('q', String(quality))
      return url.toString()
    case 'images.pexels.com':
      scaledWidthParams(url, width, 'w', 'h')
      url.searchParams.set('auto', 'compress')
      return url.toString()
    case 'img.clerk.com':
      url.searchParams.set('width', String(width))
      return url.toString()
    default:
      url.searchParams.set('w', String(width))
      return url.toString()
  }
}
