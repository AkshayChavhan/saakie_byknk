import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Keep private / non-content routes out of the index.
      disallow: [
        '/admin',
        '/api',
        '/account',
        '/cart',
        '/checkout',
        '/wishlist',
        '/sign-in',
        '/sign-up',
        '/offline',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
