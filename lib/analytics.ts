/**
 * Basic traffic analytics through Umami (page views, visitors, referrers,
 * devices, countries). Nothing else is tracked: no custom events, no
 * revenue, no user identity.
 *
 * The script loads only when `NEXT_PUBLIC_UMAMI_WEBSITE_ID` is set, so local
 * development, tests and preview builds stay silent until it is configured.
 */

/** Umami Cloud's script. Set NEXT_PUBLIC_UMAMI_SCRIPT_URL to use a self-hosted instance instead. */
export const DEFAULT_UMAMI_SCRIPT_URL = 'https://cloud.umami.is/script.js'

export interface UmamiConfig {
  src: string
  websiteId: string
  /** Hostnames allowed to report, comma separated; null means every host. */
  domains: string | null
}

// Umami website ids are UUIDs.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * The site's own hostname and its www / non-www twin, so visits to a
 * Netlify preview, a deploy URL or localhost are never counted as traffic.
 */
function productionDomains(appUrl: string | undefined): string | null {
  if (!appUrl) return null
  let host: string
  try {
    const url = new URL(appUrl)
    if (url.protocol !== 'https:') return null
    host = url.hostname.toLowerCase()
  } catch {
    return null
  }
  if (host === 'localhost') return null
  const twin = host.startsWith('www.') ? host.slice(4) : `www.${host}`
  return `${host},${twin}`
}

export function getUmamiConfig(env: Record<string, string | undefined> = process.env): UmamiConfig | null {
  const websiteId = env.NEXT_PUBLIC_UMAMI_WEBSITE_ID?.trim()
  if (!websiteId || !UUID.test(websiteId)) return null

  const src = env.NEXT_PUBLIC_UMAMI_SCRIPT_URL?.trim() || DEFAULT_UMAMI_SCRIPT_URL
  if (!src.startsWith('https://')) return null

  const explicit = env.NEXT_PUBLIC_UMAMI_DOMAINS?.trim()
  const domains = explicit || productionDomains(env.NEXT_PUBLIC_APP_URL)

  return { src, websiteId, domains }
}

/**
 * The Umami "share" link for the admin Analytics shortcut, or null when it is
 * unset or not https. Server-only (no NEXT_PUBLIC_ prefix) so it never ships
 * to the browser.
 */
export function getUmamiShareUrl(env: NodeJS.ProcessEnv = process.env): string | null {
  const raw = env.UMAMI_SHARE_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}
