import 'server-only';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import type { RecommendedProduct } from '@/types/chat';

/**
 * Fashion Assistant tools — Phase 3 (function/tool calling).
 *
 * In Phase 1 & 2 the model could only talk about sarees in the abstract — it
 * had no way to see the real catalogue. Now we give it three small, focused
 * tools that hit the live Prisma DB:
 *
 *   • searchProducts     — find products by query/filters
 *   • getProductDetails  — full info for a single slug
 *   • getCategories      — list categories the shop sells
 *
 * The model itself decides *when* to call a tool (that's what makes this
 * "tool calling" rather than RAG — in Phase 4 we'll always inject context
 * up-front whether the model wants it or not).
 *
 * Each tool has two parts:
 *
 *   1. A **schema** — a Zod schema that doubles as:
 *        - the JSON Schema we hand to Claude (`tools[].input_schema`),
 *        - the runtime validator for the args the model sends back,
 *        - the TypeScript type for our handler.
 *      Zod is the single source of truth — no drift between the docs Claude
 *      sees, what we accept, and the types in the handler.
 *
 *   2. A **handler** — a plain async function that:
 *        - parses Claude's arbitrary input through Zod (throws on bad shape),
 *        - runs the Prisma query,
 *        - shapes the result to fit the chat UI's `RecommendedProduct` type
 *          (`types/chat.ts`) so `ProductCardMini` renders without changes.
 *
 * The route (`app/api/chat/route.ts`) keeps a tiny `name → handler` map and
 * runs whichever tool Claude asked for, then feeds the JSON result back as
 * a `tool_result` content block. That loop is the whole agent dance.
 */

// ─── Shared shapes ──────────────────────────────────────────────────────────

const PLACEHOLDER_IMAGE = '/images/placeholder-product.jpg';

const RecommendedProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  price: z.number(),
  image: z.string(),
  category: z.string(),
});

// ─── searchProducts ─────────────────────────────────────────────────────────

const SearchProductsInput = z
  .object({
    query: z
      .string()
      .optional()
      .describe(
        'Free-text search across product name, description and tags. Use natural keywords like "red silk" or "wedding banarasi".'
      ),
    categorySlug: z
      .string()
      .optional()
      .describe(
        'Narrow to a category. Use a slug like "silk-sarees" — call getCategories first if you do not know the available slugs.'
      ),
    minPrice: z
      .number()
      .nonnegative()
      .optional()
      .describe('Minimum price in ₹ (Indian rupees).'),
    maxPrice: z
      .number()
      .positive()
      .optional()
      .describe('Maximum price in ₹ (Indian rupees).'),
    occasion: z
      .string()
      .optional()
      .describe(
        'Occasion tag the saree is suitable for — e.g. "wedding", "festival", "office", "casual".'
      ),
    material: z
      .string()
      .optional()
      .describe('Fabric/material — e.g. "silk", "cotton", "georgette".'),
    inStockOnly: z
      .boolean()
      .optional()
      .describe('When true, only return items currently in stock.'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(12)
      .optional()
      .describe(
        'How many products to return (1–12). Default 6 — keep this small unless the user asked to see many.'
      ),
  })
  .describe(
    'Search the live saree catalogue. At least one filter is recommended; an empty call returns the newest products.'
  );

async function searchProducts(rawInput: unknown) {
  const input = SearchProductsInput.parse(rawInput);
  const limit = input.limit ?? 6;

  const where: Record<string, unknown> = { isActive: true };

  if (input.categorySlug) {
    const cat = await prisma.category.findUnique({
      where: { slug: input.categorySlug },
      select: { id: true },
    });
    if (cat) where.categoryId = cat.id;
  }

  if (input.minPrice !== undefined || input.maxPrice !== undefined) {
    where.price = {
      ...(input.minPrice !== undefined ? { gte: input.minPrice } : {}),
      ...(input.maxPrice !== undefined ? { lte: input.maxPrice } : {}),
    };
  }

  if (input.inStockOnly) where.stock = { gt: 0 };
  if (input.material) {
    where.material = { contains: input.material, mode: 'insensitive' };
  }
  if (input.occasion) where.occasion = { has: input.occasion };

  if (input.query?.trim()) {
    const term = input.query.trim();
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
      { tags: { has: term } },
    ];
  }

  const rows = await prisma.product.findMany({
    where,
    take: limit,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      images: { select: { url: true }, take: 1, orderBy: { order: 'asc' } },
      category: { select: { name: true } },
    },
  });

  const totalFound = await prisma.product.count({ where });

  const products: RecommendedProduct[] = rows.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    image: p.images[0]?.url ?? PLACEHOLDER_IMAGE,
    category: p.category?.name ?? '',
  }));

  return {
    products,
    totalFound,
    summary:
      products.length === 0
        ? 'No products matched.'
        : `Returned ${products.length} of ${totalFound} matching products.`,
  };
}

// ─── getProductDetails ──────────────────────────────────────────────────────

const GetProductDetailsInput = z
  .object({
    slug: z
      .string()
      .min(1)
      .describe(
        'The product slug (URL fragment) — e.g. "emerald-banarasi-silk". Returned in every searchProducts result.'
      ),
  })
  .describe('Fetch full information for a single saree by its slug.');

async function getProductDetails(rawInput: unknown) {
  const input = GetProductDetailsInput.parse(rawInput);

  const p = await prisma.product.findUnique({
    where: { slug: input.slug },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      comparePrice: true,
      description: true,
      shortDescription: true,
      material: true,
      pattern: true,
      fabric: true,
      occasion: true,
      stock: true,
      isActive: true,
      images: { select: { url: true }, take: 1, orderBy: { order: 'asc' } },
      category: { select: { name: true } },
      colors: { select: { name: true, hexCode: true } },
      sizes: { select: { name: true } },
    },
  });

  if (!p || !p.isActive) {
    return { found: false as const, summary: `No active product with slug "${input.slug}".` };
  }

  const card: RecommendedProduct = {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    image: p.images[0]?.url ?? PLACEHOLDER_IMAGE,
    category: p.category?.name ?? '',
  };

  return {
    found: true as const,
    product: {
      ...card,
      comparePrice: p.comparePrice,
      description: p.shortDescription ?? p.description,
      material: p.material,
      pattern: p.pattern,
      fabric: p.fabric,
      occasion: p.occasion,
      colors: p.colors.map((c) => c.name),
      sizes: p.sizes.map((s) => s.name),
      stock: p.stock,
      inStock: p.stock > 0,
    },
    summary: `Found "${p.name}" in ${p.category?.name ?? 'the catalogue'}.`,
  };
}

// ─── getCategories ──────────────────────────────────────────────────────────

const GetCategoriesInput = z
  .object({})
  .describe(
    'List active product categories along with how many products each has. Useful for steering searchProducts.'
  );

async function getCategories(rawInput: unknown) {
  GetCategoriesInput.parse(rawInput);

  const cats = await prisma.category.findMany({
    where: { isActive: true },
    select: {
      name: true,
      slug: true,
      _count: { select: { products: { where: { isActive: true } } } },
    },
    orderBy: { name: 'asc' },
  });

  return {
    categories: cats.map((c) => ({
      name: c.name,
      slug: c.slug,
      productCount: c._count.products,
    })),
    summary: `Returned ${cats.length} active categories.`,
  };
}

// ─── Tool registry ──────────────────────────────────────────────────────────

/**
 * A tool definition packaged for the Anthropic SDK.
 *
 * Anthropic expects raw JSON Schema in `input_schema` — we convert from Zod
 * via `z.toJSONSchema(...)` so the docs Claude reads can never drift from the
 * validator the handler runs.
 */
export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: { type: 'object'; [key: string]: unknown };
}

interface ToolEntry {
  definition: AnthropicTool;
  handler: (input: unknown) => Promise<ToolResult>;
  /** Whether this tool's result contributes products[] to the UI sentinel. */
  yieldsProducts: boolean;
}

export type ToolResult =
  | { products: RecommendedProduct[]; totalFound: number; summary: string }
  | {
      found: true;
      product: RecommendedProduct & Record<string, unknown>;
      summary: string;
    }
  | { found: false; summary: string }
  | {
      categories: { name: string; slug: string; productCount: number }[];
      summary: string;
    };

function toJsonSchema(
  schema: z.ZodType
): { type: 'object'; [key: string]: unknown } {
  // Zod 4 ships toJSONSchema natively. We strip `$schema` because Anthropic
  // ignores it (and prefers a clean object). Anthropic's tool API requires
  // input_schema.type to be the literal "object" — every tool we expose has
  // an object root by construction, so we assert that narrowly here.
  const json = z.toJSONSchema(schema, { target: 'draft-7' }) as Record<
    string,
    unknown
  >;
  delete json.$schema;
  if (json.type !== 'object') json.type = 'object';
  return json as { type: 'object'; [key: string]: unknown };
}

export const TOOLS: Record<string, ToolEntry> = {
  searchProducts: {
    definition: {
      name: 'searchProducts',
      description:
        'Search the live saree catalogue by free-text query and/or filters (category, price, occasion, material, in-stock). Returns up to 12 product cards plus a total match count. Call this whenever the customer asks to see, find, browse, or compare specific products.',
      input_schema: toJsonSchema(SearchProductsInput),
    },
    handler: searchProducts,
    yieldsProducts: true,
  },
  getProductDetails: {
    definition: {
      name: 'getProductDetails',
      description:
        'Fetch full information about a single saree by its slug — description, material, colours, sizes, stock. Call this when the customer asks to know more about a specific product (use the slug from a prior searchProducts result).',
      input_schema: toJsonSchema(GetProductDetailsInput),
    },
    handler: getProductDetails,
    yieldsProducts: true,
  },
  getCategories: {
    definition: {
      name: 'getCategories',
      description:
        'List the active product categories in the shop, with the number of products in each. Useful when the customer asks what categories exist or which slug to use for searchProducts.',
      input_schema: toJsonSchema(GetCategoriesInput),
    },
    handler: getCategories,
    yieldsProducts: false,
  },
};

/** The list of tool definitions to pass to `anthropic.messages.stream`. */
export const TOOL_DEFINITIONS: AnthropicTool[] = Object.values(TOOLS).map(
  (t) => t.definition
);

/**
 * Extract any products from a tool result for the trailing UI sentinel.
 *
 * The chat route accumulates these across the tool loop and de-dupes by id
 * before emitting the `[[PRODUCTS]]{"products":[...]}` payload.
 */
export function productsFromToolResult(
  toolName: string,
  result: ToolResult
): RecommendedProduct[] {
  const entry = TOOLS[toolName];
  if (!entry?.yieldsProducts) return [];

  if ('products' in result) return result.products;
  if ('found' in result && result.found) {
    const { id, name, slug, price, image, category } = result.product;
    return [{ id, name, slug, price, image, category }];
  }
  return [];
}
