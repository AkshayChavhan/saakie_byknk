import 'server-only';
import prisma from '@/lib/prisma';
import { watermarkImageUrl } from '@/lib/image-watermark';
import { IMAGE_ORDER } from '@/lib/server/image-order';
import { cached, TAG } from '@/lib/server/cache';

/** Longest query the suggester looks at; anything past it is ignored. */
export const MAX_QUERY_LENGTH = 60;
const PRODUCT_LIMIT = 6;
const CATEGORY_LIMIT = 3;

export interface ProductSuggestion {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string | null;
  category: string | null;
}

export interface CategorySuggestion {
  id: string;
  name: string;
  slug: string;
}

export interface SearchSuggestions {
  query: string;
  products: ProductSuggestion[];
  categories: CategorySuggestion[];
}

/**
 * How well `text` matches `query`, lower is better: the text starts with it
 * (0), a word inside starts with it (1), it appears anywhere (2), no match (3).
 */
export function matchRank(text: string | null | undefined, query: string): number {
  if (!text) return 3;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (t.startsWith(q)) return 0;
  if (t.split(/[\s\-_/,]+/).some((word) => word.startsWith(q))) return 1;
  return t.includes(q) ? 2 : 3;
}

/** One saree as the search index keeps it: everything a suggestion shows or matches on. */
interface IndexedProduct extends ProductSuggestion {
  fabric: string | null;
  pattern: string | null;
}

export interface SearchIndex {
  /** Active sarees, newest first. */
  products: IndexedProduct[];
  /** Active categories, A to Z. */
  categories: CategorySuggestion[];
}

/**
 * Every active saree and category with just the fields search needs, about
 * 15 KB for the current catalogue. Held in the tagged cache, so suggestion
 * requests filter it in memory and never query the database. Any admin
 * product or category write clears it (both tags), as does payment
 * settlement and review moderation through `products`.
 */
export const loadSearchIndex = cached(
  async (): Promise<SearchIndex> => {
    const [products, categories] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          fabric: true,
          pattern: true,
          images: { select: { url: true }, take: 1, orderBy: IMAGE_ORDER },
          category: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.category.findMany({
        where: { isActive: true },
        select: { id: true, name: true, slug: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        fabric: p.fabric,
        pattern: p.pattern,
        image: p.images[0]?.url ? watermarkImageUrl(p.images[0].url) : null,
        category: p.category?.name ?? null,
      })),
      categories,
    };
  },
  'search-index',
  { tags: [TAG.products, TAG.categories] }
);

/**
 * Typeahead results for the header search, refreshed letter by letter.
 * Matches active sarees on name, fabric, pattern or category name, and
 * active categories on name, all in memory against `loadSearchIndex`. A
 * saree whose name matches beats one that only matches on fabric or
 * category, and within that, names that start with the typed letters come
 * first; equal matches keep the newest first.
 */
export async function searchSuggestions(rawQuery: string): Promise<SearchSuggestions> {
  const query = rawQuery.trim().slice(0, MAX_QUERY_LENGTH);
  if (!query) return { query, products: [], categories: [] };

  const index = await loadSearchIndex();

  const productScore = (p: IndexedProduct) => {
    const byName = matchRank(p.name, query);
    if (byName < 3) return byName;
    // Matched only on fabric, pattern or category: after every name match.
    return 3 + Math.min(matchRank(p.fabric, query), matchRank(p.pattern, query), matchRank(p.category, query));
  };

  return {
    query,
    products: index.products
      .map((p) => ({ p, score: productScore(p) }))
      // 6 means nothing matched; anything lower is a hit.
      .filter(({ score }) => score < 6)
      // Stable: equal scores keep the index's newest-first order.
      .sort((a, b) => a.score - b.score)
      .slice(0, PRODUCT_LIMIT)
      .map(({ p }) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        image: p.image,
        category: p.category,
      })),
    categories: index.categories
      .map((c) => ({ c, score: matchRank(c.name, query) }))
      .filter(({ score }) => score < 3)
      .sort((a, b) => a.score - b.score)
      .slice(0, CATEGORY_LIMIT)
      .map(({ c }) => c),
  };
}
