import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { apiError } from '@/lib/server/errors';
import { getSubtreeProductCounts } from '@/lib/server/category-counts';

export const runtime = 'nodejs';
export const revalidate = 300;

/**
 * The category tree behind the header's "Categories" dropdown: active
 * top-level categories, each with its active sub-categories.
 *
 * Anything whose subtree holds no active product is dropped — a nav entry
 * that lands the shopper on an empty listing is worse than no entry at all.
 * The rollup is by subtree, so a parent survives on its children's stock even
 * when it has none filed directly against it (which is the common case here).
 *
 * Separate from GET /api/categories, which is shaped for the category grid:
 * that one carries hero images and no child names, neither of which the nav
 * needs, and it costs an image lookup per category to build.
 */
export async function GET() {
  try {
    const [categories, counts] = await Promise.all([
      prisma.category.findMany({
        where: { isActive: true, parentId: null },
        select: {
          id: true,
          name: true,
          slug: true,
          children: {
            where: { isActive: true },
            select: { id: true, name: true, slug: true },
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      }),
      getSubtreeProductCounts(),
    ]);

    const tree = categories
      .map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        count: counts.get(category.id) ?? 0,
        children: category.children
          .map((child) => ({
            id: child.id,
            name: child.name,
            slug: child.slug,
            count: counts.get(child.id) ?? 0,
          }))
          .filter((child) => child.count > 0),
      }))
      .filter((category) => category.count > 0);

    return NextResponse.json(tree);
  } catch (error) {
    return apiError(error);
  }
}
