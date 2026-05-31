import 'server-only';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import type { RecommendedProduct } from '@/types/chat';

/**
 * Shared keyword search primitive for the Fashion Assistant.
 *
 * Phase 3 introduced tool calling: Claude calls `searchProducts` when it
 * decides it needs product data. Phase 4 introduces RAG: the server runs the
 * same search on every request *before* Claude sees the message and injects
 * the matches as context.
 *
 * Both paths want the same `where`-clause logic and the same product shape
 * out. Keeping them in one place means there's no chance for the tool's
 * results and the RAG context to disagree about what "silk under 5k" returns.
 *
 * Provider-agnostic filename (`keyword-search.ts`, not `claude-search.ts`):
 * this file is pure Prisma — it doesn't know or care which LLM consumes the
 * results. Phase 5 will add `lib/ai/vector-search.ts` next to it.
 */

const PLACEHOLDER_IMAGE = '/images/placeholder-product.jpg';

export interface KeywordSearchFilters {
  /** Free-text query — matched against name, description, and tags. */
  query?: string;
  /** Narrow to a single category by slug. */
  categorySlug?: string;
  /** Min price in ₹. */
  minPrice?: number;
  /** Max price in ₹. */
  maxPrice?: number;
  /** Match an entry in Product.occasion[]. */
  occasion?: string;
  /** Case-insensitive substring match on Product.material. */
  material?: string;
  /** Drop items with stock <= 0 when true. */
  inStockOnly?: boolean;
}

/**
 * Build the Prisma `where` clause for an active-products search.
 *
 * Resolves `categorySlug` against the DB to get the internal `categoryId`.
 * If the slug doesn't exist, the category filter is silently dropped — we'd
 * rather show a broad result than confuse the user (or Claude) with zero
 * matches due to a misspelled slug.
 */
export async function buildProductWhere(
  filters: KeywordSearchFilters
): Promise<Prisma.ProductWhereInput> {
  const where: Prisma.ProductWhereInput = { isActive: true };

  if (filters.categorySlug) {
    const cat = await prisma.category.findUnique({
      where: { slug: filters.categorySlug },
      select: { id: true },
    });
    if (cat) where.categoryId = cat.id;
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.price = {
      ...(filters.minPrice !== undefined ? { gte: filters.minPrice } : {}),
      ...(filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}),
    };
  }

  if (filters.inStockOnly) where.stock = { gt: 0 };

  if (filters.material) {
    where.material = { contains: filters.material, mode: 'insensitive' };
  }

  if (filters.occasion) {
    where.occasion = { has: filters.occasion };
  }

  if (filters.query?.trim()) {
    const term = filters.query.trim();
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
      { tags: { has: term } },
    ];
  }

  return where;
}

/**
 * Internal row shape — selected once, mapped to RecommendedProduct in
 * `keywordSearchProducts` and to a context-formatted line in `retrieval.ts`.
 *
 * The description is included so RAG can ground the model on a one-line
 * preview without an extra DB hit. Tool-calling clients don't need it but
 * the over-select is cheap (single column from a row we already fetched).
 */
export interface KeywordProductRow {
  id: string;
  name: string;
  slug: string;
  price: number;
  description: string;
  shortDescription: string | null;
  categoryName: string;
  imageUrl: string;
}

function toRow(p: {
  id: string;
  name: string;
  slug: string;
  price: number;
  description: string;
  shortDescription: string | null;
  images: { url: string }[];
  category: { name: string } | null;
}): KeywordProductRow {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    description: p.description,
    shortDescription: p.shortDescription,
    categoryName: p.category?.name ?? '',
    imageUrl: p.images[0]?.url ?? PLACEHOLDER_IMAGE,
  };
}

/**
 * Map a fetched row to the wire-shape the chat UI's `ProductCardMini`
 * expects. RAG and tools both go through this so the cards render
 * identically whichever path surfaced them.
 */
export function rowToRecommendedProduct(
  row: KeywordProductRow
): RecommendedProduct {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    price: row.price,
    image: row.imageUrl,
    category: row.categoryName,
  };
}

/**
 * Keyword search with a hard cap on returned rows.
 *
 * Used by:
 *   - `lib/ai/tools.ts` → `searchProducts` (Phase 3)
 *   - `lib/ai/retrieval.ts` → `retrieveContext` (Phase 4)
 *
 * Returns both the row form (so RAG can format descriptions into the context
 * block) and the `totalFound` count (so Claude can report "6 of 23" instead
 * of pretending there are only 6 matches in the entire catalogue).
 */
export async function keywordSearchProducts(
  filters: KeywordSearchFilters,
  limit: number
): Promise<{ rows: KeywordProductRow[]; totalFound: number }> {
  const where = await buildProductWhere(filters);

  const [rows, totalFound] = await Promise.all([
    prisma.product.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        description: true,
        shortDescription: true,
        images: { select: { url: true }, take: 1, orderBy: { order: 'asc' } },
        category: { select: { name: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return { rows: rows.map(toRow), totalFound };
}
