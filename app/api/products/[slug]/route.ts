import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;

    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        images: true,
        colors: true,
        sizes: true,
        category: true,
        reviews: {
          include: {
            user: { select: { name: true, imageUrl: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: { select: { reviews: true } },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const avgRating =
      product.reviews.length > 0
        ? product.reviews.reduce((sum, r) => sum + r.rating, 0) /
          product.reviews.length
        : 0;

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
        images: { select: { url: true }, take: 1 },
      },
      take: 4,
      orderBy: { createdAt: 'desc' },
    });

    const relatedProducts = related.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      comparePrice: p.comparePrice ?? p.price,
      image: p.images[0]?.url || '/images/placeholder-product.jpg',
    }));

    return NextResponse.json({
      ...product,
      avgRating,
      reviewCount: product._count.reviews,
      relatedProducts,
    });
  } catch (error) {
    return apiError(error);
  }
}
