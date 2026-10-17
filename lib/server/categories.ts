import 'server-only';
import { cache } from 'react';
import prisma from '@/lib/prisma';
import { getSubtreeProductCounts } from '@/lib/server/category-counts';

export interface CategoryDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  productCount: number;
  children: Array<{ id: string; name: string; slug: string; image: string; count: number }>;
}

/**
 * A category with its sub-category tiles and subtree product count — what
 * the category page needs before it lists products. Rendered on the server
 * and handed to `CategoryView` as initial data, so the client no longer
 * requests `/api/categories/[slug]` (which also returned a page of products
 * the view threw away) before it could ask for the listing.
 *
 * React `cache()`: `generateMetadata` and the page body share one query.
 */
export const loadCategoryDetail = cache(async (slug: string): Promise<CategoryDetail | null> => {
  const [category, subtreeCounts] = await Promise.all([
    prisma.category.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        isActive: true,
        children: {
          where: { isActive: true },
          select: { id: true, name: true, slug: true, image: true },
          orderBy: { name: 'asc' },
        },
      },
    }),
    getSubtreeProductCounts(),
  ]);

  if (!category || !category.isActive) return null;

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    image: category.image,
    productCount: subtreeCounts.get(category.id) ?? 0,
    children: category.children.map((child) => ({
      id: child.id,
      name: child.name,
      slug: child.slug,
      image: child.image || '/images/placeholder-category.svg',
      count: subtreeCounts.get(child.id) ?? 0,
    })),
  };
});
