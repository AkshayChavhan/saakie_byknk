/**
 * Browser-side image compression for admin uploads.
 *
 * Vercel caps a serverless function's request body at 4.5 MB, and the admin
 * forms post every selected image in a single multipart request. A modern
 * phone photo is 4-8 MB, so even one or two of them get rejected at the edge
 * with a 413 "payload too large" before the route handler ever runs.
 *
 * Re-encoding each file on a canvas — capped at 1600px on the long edge and
 * saved as WebP — takes a typical saree photo down to ~200-400 KB with no
 * visible quality loss at the sizes the storefront renders. Ten images then
 * comfortably fit under the cap.
 *
 * Browser-only: every function here no-ops (returning the input untouched) if
 * called where `document` doesn't exist.
 */

/** Long-edge cap in pixels. Above the largest size the storefront renders. */
export const DEFAULT_MAX_DIMENSION = 1600

/** Encoder quality. 0.82 is the knee of the size/artefact curve for photos. */
export const DEFAULT_QUALITY = 0.82

/**
 * Client-side ceiling for a whole multipart request. Vercel's hard limit is
 * 4.5 MB; the slack absorbs multipart boundaries and the `data` JSON field so
 * the user gets a clear message instead of an opaque 413.
 */
export const MAX_TOTAL_UPLOAD_BYTES = 4 * 1024 * 1024

export interface CompressOptions {
  /** Long-edge cap in pixels. Images already smaller are never upscaled. */
  maxDimension?: number
  /** Encoder quality, 0-1. */
  quality?: number
}

/**
 * Scale `width`x`height` down so neither edge exceeds `max`, preserving the
 * aspect ratio. Returns the input unchanged when it already fits — this never
 * upscales.
 */
export function fitWithin(
  width: number,
  height: number,
  max: number
): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= max) return { width, height }
  const scale = max / longest
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/** Total byte size of a set of files. */
export function totalSize(files: File[]): number {
  return files.reduce((sum, file) => sum + file.size, 0)
}

/** Human-readable byte count, e.g. `2.4 MB`. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Safari only gained canvas WebP encoding in 14. Probe once and cache — a
// browser that can't encode WebP silently hands back a PNG from toBlob(),
// which would be far larger than the original we're trying to shrink.
let webpSupport: boolean | null = null

function supportsWebp(): boolean {
  if (webpSupport !== null) return webpSupport
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  webpSupport = canvas.toDataURL('image/webp').startsWith('data:image/webp')
  return webpSupport
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality))
}

function renameExtension(filename: string, mimeType: string): string {
  const ext = mimeType === 'image/webp' ? 'webp' : 'jpg'
  const base = filename.replace(/\.[^./\\]+$/, '') || 'image'
  return `${base}.${ext}`
}

/**
 * Resize and re-encode a single image.
 *
 * Returns the original file untouched when it isn't an image, when the browser
 * can't decode it (HEIC, for instance — server-side validation reports that
 * clearly), or when re-encoding wouldn't actually save bytes.
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const { maxDimension = DEFAULT_MAX_DIMENSION, quality = DEFAULT_QUALITY } = options

  if (typeof document === 'undefined') return file
  if (!file.type.startsWith('image/')) return file

  let bitmap: ImageBitmap
  try {
    // `from-image` applies the EXIF orientation tag, which phone cameras rely
    // on — drawing the raw pixels would land sideways.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return file
  }

  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxDimension)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) return file

    const outputType = supportsWebp() ? 'image/webp' : 'image/jpeg'
    // JPEG has no alpha channel: transparent pixels would encode as black.
    if (outputType === 'image/jpeg') {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
    }
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await canvasToBlob(canvas, outputType, quality)
    // A tiny source can re-encode larger than it started; keep the smaller one.
    if (!blob || blob.size >= file.size) return file

    return new File([blob], renameExtension(file.name, outputType), {
      type: outputType,
      lastModified: file.lastModified,
    })
  } catch {
    return file
  } finally {
    bitmap.close?.()
  }
}

/**
 * Compress a batch of images one at a time. Sequential on purpose: decoding
 * several multi-megapixel photos at once spikes memory hard enough to crash
 * the tab on mid-range phones, which is exactly where these uploads originate.
 */
export async function compressImages(
  files: File[],
  options: CompressOptions = {},
  onProgress?: (done: number, total: number) => void
): Promise<File[]> {
  const out: File[] = []
  for (const file of files) {
    out.push(await compressImage(file, options))
    onProgress?.(out.length, files.length)
  }
  return out
}
