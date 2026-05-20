import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const revalidate = 60;

export async function GET() {
  try {
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
        category: { select: { name: true, slug: true } },
        _count: { select: { reviews: true } },
      },
      take: 8,
      orderBy: { createdAt: 'desc' },
    });

    const formattedProducts = products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      comparePrice: product.comparePrice || product.price * 1.3,
      rating: product._count.reviews > 0 ? 4.5 : 0,
      reviews: product._count.reviews,
      image: product.images[0]?.url || '/images/placeholder-product.jpg',
      category: product.category,
      inStock: product.stock > 0,
    }));

    return NextResponse.json(formattedProducts);
  } catch (error) {
    return apiError(error);
  }
}
