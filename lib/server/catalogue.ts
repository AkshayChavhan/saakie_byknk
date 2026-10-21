import 'server-only';
import prisma from '@/lib/prisma';
import { watermarkImageUrl } from '@/lib/image-watermark';
import { IMAGE_ORDER } from '@/lib/server/image-order';
import { cached, TAG } from '@/lib/server/cache';
import { getCategoryScopeIds } from '@/lib/server/category-counts';

/** One active product with every field the listing filters, sorts or shows. */
export interface CatalogueProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  tags: string[];
  price: number;
  comparePrice: number | null;
  stock: number;
  isFeatured: boolean;
  /** ISO string: the cache stores JSON. */
  createdAt: string;
  rating: number;
  salesCount: number;
  categoryId: string;
  /** First photo in the admin's order, watermarked, or the placeholder. */
  image: string;
  /** Distinct colour hex codes. */
  colors: string[];
  category: { name: string; slug: string } | null;
  /** Approved reviews only. */
  reviews: number;
}

export interface Catalogue {
  /** Active products, newest first. */
  products: CatalogueProduct[];
  /** Every category's slug and id (inactive ones too), for the category filter. */
  categorySlugs: Array<[string, string]>;
}

const PLACEHOLDER_IMAGE = '/images/placeholder-product.svg';

/**
 * Every active product with what the shop listing needs, read in one go and
 * kept in the tagged cache. The shop page and category pages then filter,
 * sort and page it in memory, so changing a filter costs no database query.
 * Any admin product or category write clears it, as do payment settlement
 * (stock, sales count) and review moderation (rating, review count).
 */
export const loadCatalogue = cached(
  async (): Promise<Catalogue> => {
    const [products, categories] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          tags: true,
          price: true,
          comparePrice: true,
          stock: true,
          isFeatured: true,
          createdAt: true,
          rating: true,
          salesCount: true,
          categoryId: true,
          images: { select: { url: true }, take: 1, orderBy: IMAGE_ORDER },
          colors: { select: { hexCode: true } },
          category: { select: { name: true, slug: true } },
          // Approved only: unapproved reviews are never shown publicly.
          _count: { select: { reviews: { where: { status: 'APPROVED' } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.category.findMany({ select: { id: true, slug: true } }),
    ]);

    return {
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description ?? '',
        tags: p.tags ?? [],
        price: p.price,
        comparePrice: p.comparePrice,
        stock: p.stock,
        isFeatured: p.isFeatured,
        createdAt: new Date(p.createdAt).toISOString(),
        rating: p.rating,
        salesCount: p.salesCount,
        categoryId: p.categoryId,
        image: watermarkImageUrl(p.images[0]?.url || PLACEHOLDER_IMAGE),
        colors: Array.from(new Set(p.colors.map((c) => c.hexCode))),
        category: p.category,
        reviews: p._count.reviews,
      })),
      categorySlugs: categories.map((c) => [c.slug, c.id] as [string, string]),
    };
  },
  'product-catalogue',
  { tags: [TAG.products, TAG.categories] }
);

export interface ListingQuery {
  category?: string | null;
  search?: string | null;
  sort?: string | null;
  minPrice?: string | null;
  maxPrice?: string | null;
  inStock?: string | null;
  featured?: string | null;
  sale?: string | null;
  /** Comma-separated hex codes, e.g. "#FF0000,#00FF00". */
  colors?: string | null;
  page: number;
  limit: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const createdMs = (p: CatalogueProduct) => Date.parse(p.createdAt);

/** Newest first; the tie-break for every other order too. */
const byNewest = (a: CatalogueProduct, b: CatalogueProduct) => createdMs(b) - createdMs(a);

const SORTS: Record<string, (a: CatalogueProduct, b: CatalogueProduct) => number> = {
  'price-low': (a, b) => a.price - b.price || byNewest(a, b),
  'price-high': (a, b) => b.price - a.price || byNewest(a, b),
  // salesCount and rating are maintained on the product by payment
  // settlement and review moderation, never counted per request.
  popular: (a, b) => b.salesCount - a.salesCount || byNewest(a, b),
  rating: (a, b) => b.rating - a.rating || byNewest(a, b),
  newest: byNewest,
};

/**
 * One page of the shop listing, filtered, sorted and paged in memory from
 * the cached catalogue. Same rules as the database query it replaces:
 *   - category: the category and every active sub-category; an unknown slug
 *     matches nothing rather than the whole catalogue;
 *   - price: applied only when a bound is set, both ends inclusive;
 *   - sale: a genuine markdown, compare-at price strictly above the price;
 *   - colors: at least one of the requested hex codes;
 *   - search: name or description containing the text (any case), or a tag
 *     equal to it.
 */
export async function listCatalogue(query: ListingQuery, now = Date.now()) {
  const { products, categorySlugs } = await loadCatalogue();
  let rows = products;

  if (query.category) {
    const categoryId = new Map(categorySlugs).get(query.category);
    const scope = new Set(categoryId ? await getCategoryScopeIds(categoryId) : []);
    rows = rows.filter((p) => scope.has(p.categoryId));
  }

  const minPrice = parseInt(query.minPrice ?? '0');
  const maxPrice = parseInt(query.maxPrice ?? '999999');
  if (minPrice > 0 || maxPrice < 999999) {
    rows = rows.filter((p) => p.price >= minPrice && p.price <= maxPrice);
  }

  if (query.inStock === 'true') rows = rows.filter((p) => p.stock > 0);
  if (query.featured === 'true') rows = rows.filter((p) => p.isFeatured);
  if (query.sale === 'true') {
    rows = rows.filter((p) => p.comparePrice != null && p.comparePrice > p.price);
  }

  const hexes = (query.colors ?? '')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
  if (hexes.length) {
    const wanted = new Set(hexes);
    rows = rows.filter((p) => p.colors.some((hex) => wanted.has(hex)));
  }

  const term = query.search?.trim();
  if (term) {
    const lower = term.toLowerCase();
    rows = rows.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.description.toLowerCase().includes(lower) ||
        p.tags.includes(term)
    );
  }

  const sorted = [...rows].sort(SORTS[query.sort ?? 'newest'] ?? SORTS.newest);

  const totalCount = sorted.length;
  const totalPages = Math.ceil(totalCount / query.limit);
  const page = sorted.slice((query.page - 1) * query.limit, query.page * query.limit);

  return {
    products: page.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      // Pass through as-is. `null` means "not on sale" and the UI must not
      // render a discount badge — never substitute a derived reference price.
      comparePrice: p.comparePrice,
      // Rounded to the one decimal the UI renders, so a card and the product
      // page it links to read the same number.
      rating: Math.round(p.rating * 10) / 10,
      reviews: p.reviews,
      image: p.image,
      colors: p.colors,
      category: p.category,
      stock: p.stock,
      // Relative to now, so worked out per request, not stored in the cache.
      isNew: createdMs(p) > now - 30 * DAY_MS,
      isBestseller: p.salesCount > 10,
      inStock: p.stock > 0,
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      totalCount,
      totalPages,
      hasNext: query.page < totalPages,
      hasPrev: query.page > 1,
    },
  };
}
