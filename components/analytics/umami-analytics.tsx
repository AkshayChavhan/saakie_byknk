import Script from 'next/script'
import { getUmamiConfig } from '@/lib/analytics'

/**
 * Loads Umami once the website id is configured; renders nothing otherwise.
 * `data-do-not-track` makes the script respect a visitor's browser
 * Do Not Track setting, and `data-domains` (set from the site's own address)
 * keeps previews and localhost out of the numbers.
 */
export function UmamiAnalytics() {
  const config = getUmamiConfig()
  if (!config) return null

  return (
    <Script
      src={config.src}
      data-website-id={config.websiteId}
      data-do-not-track="true"
      {...(config.domains ? { 'data-domains': config.domains } : {})}
      strategy="afterInteractive"
    />
  )
}
