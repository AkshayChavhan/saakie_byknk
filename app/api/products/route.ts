import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { apiError } from '@/lib/server/errors';
import { parseLimit, parsePage } from '@/lib/server/validation';
import { watermarkImageUrl } from '@/lib/image-watermark';
import { getCategoryScopeIds } from '@/lib/server/category-counts';
import { IMAGE_ORDER } from '@/lib/server/image-order';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') ?? 'newest';
    const minPrice = searchParams.get('minPrice') ?? '0';
    const maxPrice = searchParams.get('maxPrice') ?? '999999';
    const inStock = searchParams.get('inStock');
    const colors = searchParams.get('colors');
    const sale = searchParams.get('sale');
    const pageNum = parsePage(searchParams.get('page'));
    const limitNum = parseLimit(searchParams.get('limit'), 12);
    const minPriceNum = parseInt(minPrice);
    const maxPriceNum = parseInt(maxPrice);

    const where: any = { isActive: true };

    if (category) {
      const categoryRecord = await prisma.category.findUnique({
        where: { slug: category },
        select: { id: true },
      });
      // Scope to the whole subtree: a parent category's products almost always
      // hang off its sub-categories, so an exact categoryId match would render
      // an empty grid for the very categories whose cards advertise products.
      // An unrecognised slug matches nothing rather than falling through to
      // an unfiltered listing of the entire catalogue.
      where.categoryId = categoryRecord
        ? { in: await getCategoryScopeIds(categoryRecord.id) }
        : { in: [] };
    }

    if (minPriceNum > 0 || maxPriceNum < 999999) {
      where.price = { gte: minPriceNum, lte: maxPriceNum };
    }

    if (inStock === 'true') where.stock = { gt: 0 };
    if (searchParams.get('featured') === 'true') where.isFeatured = true;

    // "On sale" means a genuine markdown — a compare-at price strictly above
    // what is being charged. A product with no comparePrice, or one that does
    // not undercut it, is not discounted. Comparing two fields of the same
    // document needs a field reference rather than a literal.
    if (sale === 'true') {
      where.comparePrice = { gt: prisma.product.fields.price };
    }

    // Filter by color: the client sends a comma-separated list of hex codes
    // (e.g. ?colors=#FF0000,#00FF00). Match products that have at least one of
    // the requested colors.
    if (colors?.trim()) {
      const hexes = colors
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
      if (hexes.length) {
        where.colors = { some: { hexCode: { in: hexes } } };
      }
    }

    // Free-text search across product name, description, and tags.
    if (search?.trim()) {
      const term = search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { tags: { has: term } },
      ];
    }

    let orderBy: any = {};
    switch (sort) {
      case 'price-low':
        orderBy = { price: 'asc' };
        break;
      case 'price-high':
        orderBy = { price: 'desc' };
        break;
      // `salesCount` and `rating` are maintained on the product (by payment
      // settlement and review moderation), so these sort on an indexed field
      // instead of counting a relation across every matching product.
      case 'popular':
        orderBy = [{ salesCount: 'desc' }, { createdAt: 'desc' }];
        break;
      case 'rating':
        orderBy = [{ rating: 'desc' }, { createdAt: 'desc' }];
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
    }

    // The page and its total are independent; run them together.
    const [totalCount, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          comparePrice: true,
          stock: true,
          createdAt: true,
          rating: true,
          salesCount: true,
          images: { select: { url: true }, take: 1, orderBy: IMAGE_ORDER },
          colors: { select: { hexCode: true } },
          category: { select: { name: true, slug: true } },
          // Approved only — the schema notes that unapproved reviews are never
          // shown publicly, and the detail endpoint already counts this way.
          _count: {
            select: {
              reviews: { where: { status: 'APPROVED' } },
            },
          },
        },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy,
      }),
    ]);

    const formattedProducts = products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      // Pass through as-is. `null` means "not on sale" and the UI must not
      // render a discount badge — never substitute a derived reference price.
      comparePrice: product.comparePrice,
      // Maintained on the product by review moderation, so a card and the
      // product page it links to read the same number. Rounded to one
      // decimal, which is the precision the UI renders.
      rating: Math.round(product.rating * 10) / 10,
      reviews: product._count.reviews,
      image: watermarkImageUrl(
        product.images[0]?.url || '/images/placeholder-product.svg'
      ),
      colors: Array.from(new Set(product.colors.map((c) => c.hexCode))),
      category: product.category,
      stock: product.stock,
      isNew:
        new Date(product.createdAt).getTime() >
        Date.now() - 30 * 24 * 60 * 60 * 1000,
      isBestseller: product.salesCount > 10,
      inStock: product.stock > 0,
    }));

    const totalPages = Math.ceil(totalCount / limitNum);

    return NextResponse.json({
      products: formattedProducts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
