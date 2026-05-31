import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const { searchParams } = new URL(request.url);
    const pageNum = parseInt(searchParams.get('page') ?? '1');
    const limitNum = parseInt(searchParams.get('limit') ?? '12');

    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        products: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            comparePrice: true,
            stock: true,
            images: { select: { url: true }, take: 1 },
          },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
        },
        // Active sub-categories of this category, with their own product counts,
        // so the storefront can show them as tiles above this category's products.
        children: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            slug: true,
            image: true,
            _count: { select: { products: true } },
          },
          orderBy: { name: 'asc' },
        },
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const totalPages = Math.ceil(category._count.products / limitNum);

    return NextResponse.json({
      ...category,
      children: category.children.map((child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        image: child.image || '/images/placeholder-category.jpg',
        count: child._count.products,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount: category._count.products,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
