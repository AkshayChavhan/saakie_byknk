import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { loadProductDetail, type ProductDetailPayload } from '@/lib/server/products'
import { ProductDetail } from './product-detail'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * Server wrapper for the product page. The interactive UI lives in the
 * 'use client' ProductDetail component; this server component loads the
 * product once (shared by the metadata, the JSON-LD and the page body through
 * React cache) and hands it to the client as initial data, so the gallery is
 * in the first HTML and the client makes no second request for it.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const product = await loadProductDetail(slug)

  if (!product || !product.isActive) {
    return {
      title: 'Product not found',
      robots: { index: false, follow: true },
    }
  }

  const title = `${product.name} | Saakie by KNK`
  const description = product.description.slice(0, 160)
  const url = `${SITE_URL}/products/${product.slug}`
  const image = product.images[0]?.url
  const images = image ? [{ url: image }] : undefined

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
      images: image ? [image] : undefined,
    },
  }
}

function ProductJsonLd({ product }: { product: ProductDetailPayload }) {
  const image = product.images[0]?.url
  const jsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: image ? [image] : undefined,
    brand: { '@type': 'Brand', name: product.brand || 'Saakie by KNK' },
    category: product.category?.name || undefined,
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
    ...(product.reviewCount > 0 && product.avgRating > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Number(product.avgRating.toFixed(1)),
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
  // loadProductDetail is cached, so this shares the query generateMetadata ran.
  const product = await loadProductDetail(slug)
  if (!product || !product.isActive) notFound()

  return (
    <>
      <ProductJsonLd product={product} />
      <ProductDetail initialProduct={JSON.parse(JSON.stringify(product))} />
    </>
  )
}
