import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { apiError } from '@/lib/server/errors';
import { getSubtreeProductCounts } from '@/lib/server/category-counts';

export const runtime = 'nodejs';
export const revalidate = 60;

export async function GET() {
  try {
    // Only top-level categories on the public storefront — sub-categories
    // are surfaced from within their parent's page (/categories/[slug]).
    const [categories, subtreeCounts] = await Promise.all([
      prisma.category.findMany({
        where: { isActive: true, parentId: null },
        select: {
          id: true,
          name: true,
          slug: true,
          image: true,
          // Newest pictured product in this category — used as the card's hero
          // shot when no image has been uploaded for the category itself.
          products: {
            where: { isActive: true, images: { some: {} } },
            select: {
              images: {
                select: { url: true },
                orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }],
                take: 1,
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          // Most products hang off sub-categories rather than the top-level
          // category, so those are the second place to look for a hero shot.
          children: {
            where: { isActive: true },
            select: {
              products: {
                where: { isActive: true, images: { some: {} } },
                select: {
                  images: {
                    select: { url: true },
                    orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }],
                    take: 1,
                  },
                },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      getSubtreeProductCounts(),
    ]);

    // Precedence: uploaded category image > a product photo from the category
    // (own products first, then sub-categories) > the generic placeholder.
    const productImage = (category: (typeof categories)[number]) =>
      category.products[0]?.images[0]?.url ??
      category.children
        .flatMap((child) => child.products)
        .map((product) => product.images[0]?.url)
        .find(Boolean);

    const formattedCategories = categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      image:
        category.image ||
        productImage(category) ||
        '/images/placeholder-category.svg',
      // Counts the sub-categories too — a top-level category's own product
      // list is usually empty, which is what made every card read "0 Products".
      count: subtreeCounts.get(category.id) ?? 0,
    }));

    return NextResponse.json(formattedCategories);
  } catch (error) {
    return apiError(error);
  }
}
