import 'server-only';
import { cache } from 'react';
import prisma from '@/lib/prisma';
import { watermarkImageUrl } from '@/lib/image-watermark';
import { IMAGE_ORDER } from '@/lib/server/image-order';
import { cached, TAG } from '@/lib/server/cache';

/** `T` after a JSON round trip: dates become ISO strings, the rest is unchanged. */
type Jsonified<T> = T extends Date
  ? string
  : T extends Array<infer U>
    ? Array<Jsonified<U>>
    : T extends object
      ? { [K in keyof T]: Jsonified<T[K]> }
      : T;

/**
 * Reads one product page's data from the database: the saree, its gallery,
 * colours, sizes, category, latest approved reviews and four related sarees
 * (about eight queries on MongoDB).
 */
async function queryProductDetail(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: IMAGE_ORDER },
      colors: true,
      sizes: true,
      category: true,
      // Only approved reviews are shown publicly.
      reviews: {
        where: { status: 'APPROVED' },
        include: {
          user: { select: { name: true, imageUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      _count: { select: { reviews: { where: { status: 'APPROVED' } } } },
    },
  });

  if (!product) return null;

  // Related products: other active products in the same category.
  const related = await prisma.product.findMany({
    where: {
      isActive: true,
      categoryId: product.categoryId,
      id: { not: product.id },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      comparePrice: true,
      images: { select: { url: true }, take: 1, orderBy: IMAGE_ORDER },
    },
    take: 4,
    orderBy: { createdAt: 'desc' },
  });

  const relatedProducts = related.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    comparePrice: p.comparePrice,
    image: watermarkImageUrl(p.images[0]?.url || '/images/placeholder-product.svg'),
  }));

  // Internal numbers stay on the server.
  const { costPrice: _costPrice, lowStockAlert: _lowStockAlert, ...publicProduct } = product;

  const payload = {
    ...publicProduct,
    // Gallery images are the full-resolution shots, so they are the ones most
    // worth lifting — watermark every one before it leaves the server.
    images: product.images.map((image) => ({
      ...image,
      url: watermarkImageUrl(image.url),
    })),
    inStock: product.stock > 0,
    // Average over approved reviews, maintained on the product by review
    // moderation (lib/server/reviews.ts) rather than recomputed per view.
    avgRating: product.rating,
    reviewCount: product._count.reviews,
    relatedProducts,
  };

  // The cache stores JSON, so dates come back as ISO strings. Convert here
  // too, so a cache hit and a fresh read always have the same shape (and the
  // types say so).
  return JSON.parse(JSON.stringify(payload)) as Jsonified<typeof payload>;
}

/**
 * Product page data, the same for every visitor, so it is kept in the tagged
 * cache per slug instead of re-read on every view. It is cleared by anything
 * that changes what the page shows:
 *   - `products`: admin product writes (details, photos, price, stock,
 *     active), payment settlement (stock after a sale), review moderation
 *     (approved reviews and the maintained rating);
 *   - `categories`: a category rename or move.
 * A newly submitted review is PENDING and not shown, so it needs no clearing.
 */
const loadProductDetailCached = cached(queryProductDetail, 'product-detail', {
  tags: [TAG.products, TAG.categories],
});

/**
 * The product detail payload, shared by the product page (server component)
 * and `GET /api/products/[slug]`. The page renders it into the first HTML and
 * hands it to the client component as initial data, so the gallery is on
 * screen without a second request for the same product.
 *
 * Wrapped in React `cache()` as well, so `generateMetadata`, the JSON-LD block
 * and the page body share one lookup per request.
 */
export const loadProductDetail = cache((slug: string) => loadProductDetailCached(slug));

export type ProductDetailPayload = NonNullable<Awaited<ReturnType<typeof loadProductDetail>>>;
