import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { apiError } from '@/lib/server/errors';
import { watermarkImageUrl } from '@/lib/image-watermark';
import { getSubtreeProductCounts } from '@/lib/server/category-counts';

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

    const [category, subtreeCounts] = await Promise.all([
      prisma.category.findUnique({
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
          // Active sub-categories, shown as tiles above this category's own
          // products. Their counts come from the subtree rollup below rather
          // than a direct `_count`, so a sub-category with children of its own
          // does not advertise 0.
          children: {
            where: { isActive: true },
            select: { id: true, name: true, slug: true, image: true },
            orderBy: { name: 'asc' },
          },
          // Active only, matching the `products` list above. Counting inactive
          // products here inflated `totalPages` and produced empty trailing
          // pages the listing could never fill.
          _count: { select: { products: { where: { isActive: true } } } },
        },
      }),
      getSubtreeProductCounts(),
    ]);

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const totalPages = Math.ceil(category._count.products / limitNum);

    return NextResponse.json({
      ...category,
      // The whole subtree, active products only. A parent category's own
      // product list is usually empty because the stock hangs off its
      // sub-categories, so a direct count reads 0 for categories that are far
      // from empty. Named to match what the storefront reads.
      productCount: subtreeCounts.get(category.id) ?? 0,
      products: category.products.map((product) => ({
        ...product,
        images: product.images.map((image) => ({
          ...image,
          url: watermarkImageUrl(image.url),
        })),
      })),
      children: category.children.map((child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        image: child.image || '/images/placeholder-category.svg',
        // Subtree count as well, so a sub-category that has its own children
        // does not advertise 0 on its tile.
        count: subtreeCounts.get(child.id) ?? 0,
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
