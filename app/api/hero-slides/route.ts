import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const revalidate = 60;

/**
 * Hero slides are built from real store products — featured products first,
 * then newest — so the homepage carousel always reflects live inventory and
 * uses real product images (no static placeholder files).
 */
export async function GET() {
  try {
    // Prefer featured products; fall back to newest active products.
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

    // Only products with a real image can be a slide.
    const slides = products
      .filter((p) => p.images[0]?.url)
      .map((p, index) => {
        const onSale = p.comparePrice != null && p.comparePrice > p.price;
        const discount = onSale
          ? Math.round(((p.comparePrice! - p.price) / p.comparePrice!) * 100)
          : null;
        const isBestseller = p._count.orderItems > 10;

        // Slide accent: sale > bestseller > featured.
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

    return NextResponse.json(slides);
  } catch (error) {
    return apiError(error);
  }
}
