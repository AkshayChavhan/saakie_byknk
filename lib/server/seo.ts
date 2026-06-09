import 'server-only';
import { cache } from 'react';
import prisma from '@/lib/prisma';

/**
 * Server-side data fetchers for generateMetadata + JSON-LD on the product and
 * category pages. Query Prisma directly (these run in server components) rather
 * than round-tripping through the public API routes.
 */

export interface ProductSeo {
  name: string;
  slug: string;
  description: string;
  price: number;
  comparePrice: number | null;
  brand: string | null;
  stock: number;
  image: string | null;
  categoryName: string | null;
  ratingValue: number | null;
  reviewCount: number;
}

// Wrapped in React cache() so generateMetadata and the JSON-LD component (which
// both call this within the same request) share a single DB query.
export const getProductSeo = cache(async (slug: string): Promise<ProductSeo | null> => {
  const product = await prisma.product.findFirst({
    where: { slug, isActive: true },
    select: {
      name: true,
      slug: true,
      description: true,
      price: true,
      comparePrice: true,
      brand: true,
      stock: true,
      images: { select: { url: true }, take: 1 },
      category: { select: { name: true } },
      reviews: {
        where: { status: 'APPROVED' },
        select: { rating: true },
      },
    },
  });

  if (!product) return null;

  const reviewCount = product.reviews.length;
  const ratingValue =
    reviewCount > 0
      ? Number(
          (
            product.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
          ).toFixed(1)
        )
      : null;

  return {
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: product.price,
    comparePrice: product.comparePrice,
    brand: product.brand,
    stock: product.stock,
    image: product.images[0]?.url ?? null,
    categoryName: product.category?.name ?? null,
    ratingValue,
    reviewCount,
  };
});

export interface CategorySeo {
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
}

export const getCategorySeo = cache(async (slug: string): Promise<CategorySeo | null> => {
  const category = await prisma.category.findFirst({
    where: { slug, isActive: true },
    select: { name: true, slug: true, description: true, image: true },
  });
  return category ?? null;
});
