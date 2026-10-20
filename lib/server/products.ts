import 'server-only';
import { cache } from 'react';
import prisma from '@/lib/prisma';
import { watermarkImageUrl } from '@/lib/image-watermark';
import { IMAGE_ORDER } from '@/lib/server/image-order';

/**
 * The product detail payload, shared by the product page (server component)
 * and `GET /api/products/[slug]`. The page renders it into the first HTML and
 * hands it to the client component as initial data, so the gallery is on
 * screen without a second request for the same product.
 *
 * Wrapped in React `cache()` so `generateMetadata`, the JSON-LD block and the
 * page body share one query per request.
 */
export const loadProductDetail = cache(async (slug: string) => {
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

  return {
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
});

export type ProductDetailPayload = NonNullable<Awaited<ReturnType<typeof loadProductDetail>>>;
