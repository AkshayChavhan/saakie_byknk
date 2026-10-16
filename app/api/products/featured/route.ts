import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { apiError } from '@/lib/server/errors';
import { cached, TAG } from '@/lib/server/cache';
import { watermarkImageUrl } from '@/lib/image-watermark';

export const runtime = 'nodejs';
export const revalidate = 60;

const loadFeaturedProducts = cached(
  async () => {
    const products = await prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        comparePrice: true,
        stock: true,
        images: { select: { url: true }, take: 1 },
        colors: { select: { hexCode: true } },
        category: { select: { name: true, slug: true } },
        rating: true,
        _count: { select: { reviews: { where: { status: 'APPROVED' } } } },
      },
      take: 8,
      orderBy: { createdAt: 'desc' },
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      // Pass through as-is. `null` means "not on sale" and the UI must not
      // render a discount badge — never substitute a derived reference price.
      comparePrice: product.comparePrice,
      // Maintained on the product by review moderation (lib/server/reviews.ts).
      rating: Math.round(product.rating * 10) / 10,
      reviews: product._count.reviews,
      image: watermarkImageUrl(
        product.images[0]?.url || '/images/placeholder-product.svg'
      ),
      colors: Array.from(new Set(product.colors.map((c) => c.hexCode))),
      category: product.category,
      inStock: product.stock > 0,
    }));
  },
  'featured-products',
  { tags: [TAG.products] }
);

export async function GET() {
  try {
    return NextResponse.json(await loadFeaturedProducts());
  } catch (error) {
    return apiError(error);
  }
}
