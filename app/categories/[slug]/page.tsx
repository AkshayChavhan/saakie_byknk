import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCategorySeo } from '@/lib/server/seo'
import { CategoryView } from './category-view'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * Server wrapper for the category page. The interactive listing/filtering UI
 * lives in the 'use client' CategoryView component; this server component adds
 * per-category SEO metadata.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const category = await getCategorySeo(slug)

  if (!category) {
    return {
      title: 'Category not found',
      robots: { index: false, follow: true },
    }
  }

  const title = `${category.name} | Saakie by KNK`
  const description =
    category.description?.slice(0, 160) ||
    `Shop our ${category.name} collection — handpicked sarees at Saakie by KNK.`
  const url = `${SITE_URL}/categories/${category.slug}`
  const images = category.image ? [{ url: category.image }] : undefined

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'website', title, description, url, siteName: 'Saakie by KNK', images },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: category.image ? [category.image] : undefined,
    },
  }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  // Cached, so this reuses the query generateMetadata already ran.
  const category = await getCategorySeo(slug)
  if (!category) notFound()

  return <CategoryView />
}
