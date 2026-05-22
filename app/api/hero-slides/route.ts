import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Public hero slides for the homepage carousel.
 *
 * Primary source: admin-managed `HeroSlide` rows. If none exist, fall back to
 * slides derived from real store products, so the homepage hero is never
 * empty before an admin has configured any slides.
 */
export async function GET() {
  try {
    const heroSlides = await prisma.heroSlide.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });

    if (heroSlides.length > 0) {
      // `hero-section.tsx` maps `ctaText`/`ctaLink`/`subtitle`/`description`/
      // `image` directly off these rows.
      return NextResponse.json(heroSlides);
    }

    return NextResponse.json(await productDerivedSlides());
  } catch (error) {
    return apiError(error);
  }
}

/**
 * Fallback slides built from real products — featured first, then newest.
 * Used only when the admin has not created any hero slides.
 */
async function productDerivedSlides() {
  let products = await prisma.product.findMany({
    where: { isActive: true, isFeatured: true },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      comparePrice: true,
      isFeatured: true,
      images: { select: { url: true }, take: 1 },
      category: { select: { name: true } },
      _count: { select: { orderItems: true } },
    },
    take: 5,
    orderBy: { createdAt: 'desc' },
  });

  if (products.length === 0) {
    products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        comparePrice: true,
        isFeatured: true,
        images: { select: { url: true }, take: 1 },
        category: { select: { name: true } },
        _count: { select: { orderItems: true } },
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });
  }

  return products
    .filter((p) => p.images[0]?.url)
    .map((p, index) => {
      const onSale = p.comparePrice != null && p.comparePrice > p.price;
      const discount = onSale
        ? Math.round(((p.comparePrice! - p.price) / p.comparePrice!) * 100)
        : null;
      const isBestseller = p._count.orderItems > 10;

      const type = onSale
        ? 'sale'
        : isBestseller
          ? 'bestseller'
          : 'featured';
      const badge = onSale
        ? `${discount}% OFF`
        : isBestseller
          ? 'Bestseller'
          : p.isFeatured
            ? 'Featured'
            : null;

      return {
        id: p.id,
        type,
        title: p.name,
        subtitle: p.category?.name ?? 'Saakie_byknk',
        description: onSale
          ? 'Limited-time offer — shop before it’s gone.'
          : 'Handpicked from our latest collection.',
        image: p.images[0].url,
        ctaText: 'Shop Now',
        ctaLink: `/products/${p.slug}`,
        badge,
        discount,
        order: index + 1,
        product: {
          name: p.name,
          price: p.price,
          comparePrice: p.comparePrice,
          category: p.category?.name ?? '',
        },
      };
    });
}
