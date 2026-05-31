import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const revalidate = 60;

export async function GET() {
  try {
    // Only top-level categories on the public storefront — sub-categories
    // are surfaced from within their parent's page (/categories/[slug]).
    const categories = await prisma.category.findMany({
      where: { isActive: true, parentId: null },
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });

    const formattedCategories = categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      image: category.image || '/images/placeholder-category.svg',
      count: category._count.products,
    }));

    return NextResponse.json(formattedCategories);
  } catch (error) {
    return apiError(error);
  }
}
