import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProductSeo, type ProductSeo } from '@/lib/server/seo'
import { ProductDetail } from './product-detail'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * Server wrapper for the product page. The interactive UI lives in the
 * 'use client' ProductDetail component; this server component adds per-product
 * SEO metadata + Product JSON-LD that the client component can't export.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductSeo(slug)

  if (!product) {
    return {
      title: 'Product not found',
      robots: { index: false, follow: true },
    }
  }

  const title = `${product.name} | Saakie by KNK`
  const description = product.description.slice(0, 160)
  const url = `${SITE_URL}/products/${product.slug}`
  const images = product.image ? [{ url: product.image }] : undefined

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      title,
      description,
      url,
      siteName: 'Saakie by KNK',
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: product.image ? [product.image] : undefined,
    },
  }
}

function ProductJsonLd({ product }: { product: ProductSeo }) {
  const jsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image ? [product.image] : undefined,
    brand: { '@type': 'Brand', name: product.brand || 'Saakie by KNK' },
    category: product.categoryName || undefined,
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/products/${product.slug}`,
      priceCurrency: 'INR',
      price: product.price,
      availability:
        product.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
    },
    ...(product.reviewCount > 0 && product.ratingValue
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.ratingValue,
            reviewCount: product.reviewCount,
          },
        }
      : {}),
  }

  return (
    <script
      type="application/ld+json"
      // Escape `<` so a stray `</script>` in DB-sourced fields can't break out
      // of the script element.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
      }}
    />
  )
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  // getProductSeo is cached, so this shares the query generateMetadata already ran.
  const product = await getProductSeo(slug)
  if (!product) notFound()

  return (
    <>
      <ProductJsonLd product={product} />
      <ProductDetail />
    </>
  )
}
