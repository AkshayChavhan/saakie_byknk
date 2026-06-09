import type { MetadataRoute } from 'next'
import prisma from '@/lib/prisma'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Public, indexable static routes (excludes auth, cart, checkout, account, etc.).
const STATIC_PATHS = [
  '',
  '/products',
  '/categories',
  '/about',
  '/our-story',
  '/blog',
  '/careers',
  '/contact',
  '/faq',
  '/post',
  '/care-instructions',
  '/size-guide',
  '/shipping-returns',
  '/privacy-policy',
  '/terms-of-service',
  '/return-policy',
  '/disclaimer',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : 0.7,
  }))

  // Pull active products + categories for per-page entries. Guard against DB
  // errors so a transient outage degrades to the static sitemap rather than 500.
  try {
    const [products, categories] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
      }),
      prisma.category.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
      }),
    ])

    const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${SITE_URL}/products/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.8,
    }))

    const categoryEntries: MetadataRoute.Sitemap = categories.map((c) => ({
      url: `${SITE_URL}/categories/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.6,
    }))

    return [...staticEntries, ...categoryEntries, ...productEntries]
  } catch {
    return staticEntries
  }
}
