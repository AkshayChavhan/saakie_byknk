import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Request validation helpers shared by the route handlers.
 *
 * Every list endpoint used to `parseInt` its `limit`/`page` straight from the
 * query string: `?limit=abc` became NaN (a Prisma 500) and `?limit=100000`
 * was honoured. The parsers here clamp to a sane range and never return NaN.
 * The zod schemas are allow-lists for the write endpoints, so a request body
 * can only set the fields the endpoint means to expose.
 */

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export function parseIntParam(
  raw: string | null | undefined,
  fallback: number,
  opts: { min?: number; max?: number } = {}
): number {
  const { min = 1, max = Number.MAX_SAFE_INTEGER } = opts;
  const n = raw == null || raw === '' ? fallback : Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export const MAX_PAGE_SIZE = 100;

/** `?limit=` clamped to [1, max]; non-numeric input falls back to the default. */
export function parseLimit(raw: string | null | undefined, fallback = 20, max = MAX_PAGE_SIZE): number {
  return parseIntParam(raw, fallback, { min: 1, max });
}

/** `?page=` clamped to >= 1. */
export function parsePage(raw: string | null | undefined): number {
  return parseIntParam(raw, 1, { min: 1, max: 100_000 });
}

/**
 * Validate `body` against `schema`. Returns the parsed value, or a 400
 * NextResponse naming the first problem, to be returned from the handler.
 */
export function validateBody<T extends z.ZodTypeAny>(
  schema: T,
  body: unknown
): z.infer<T> | NextResponse {
  const result = schema.safeParse(body);
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  const where = issue?.path?.length ? `${issue.path.join('.')}: ` : '';
  return NextResponse.json(
    {
      success: false,
      error: { message: `${where}${issue?.message ?? 'Invalid request'}`, code: 'VALIDATION_ERROR' },
    },
    { status: 400 }
  );
}

/** Largest quantity of one product a single cart line may hold. */
export const MAX_CART_QUANTITY = 20;

const quantity = z
  .number({ error: 'Quantity must be a number' })
  .int('Quantity must be a whole number')
  .min(1, 'Quantity must be at least 1')
  .max(MAX_CART_QUANTITY, `Quantity cannot exceed ${MAX_CART_QUANTITY}`);

export const cartAddSchema = z.object({
  productId: objectId,
  quantity: quantity.default(1),
});

export const cartQuantitySchema = z.object({ quantity });

export const wishlistAddSchema = z.object({ productId: objectId });

const money = z.number().finite().min(0);
const trimmed = z.string().trim();

/**
 * Scalar product fields an admin may set through the JSON PATCH. Relation
 * writes (`images`, `orderItems`, …) are not listed and therefore dropped,
 * so a body can no longer reach into other collections through Prisma's
 * nested-write syntax.
 */
export const productUpdateSchema = z
  .object({
    name: trimmed.min(1).max(200),
    slug: trimmed.min(1).max(200).regex(/^[a-z0-9-]+$/, 'Slug may only contain a-z, 0-9 and -'),
    description: z.string().max(20_000),
    shortDescription: z.string().max(1_000).nullable(),
    price: money,
    comparePrice: money.nullable(),
    costPrice: money.nullable(),
    stock: z.number().int().min(0),
    lowStockAlert: z.number().int().min(0),
    categoryId: objectId,
    brand: trimmed.max(100).nullable(),
    material: trimmed.max(100).nullable(),
    pattern: trimmed.max(100).nullable(),
    occasion: z.array(trimmed.max(100)).max(20),
    careInstructions: z.string().max(5_000).nullable(),
    weight: money.nullable(),
    blouseIncluded: z.boolean(),
    isActive: z.boolean(),
    isFeatured: z.boolean(),
  })
  .partial();

export const productCreateSchema = z.object({
  name: trimmed.min(1).max(200),
  slug: trimmed.min(1).max(200).regex(/^[a-z0-9-]+$/, 'Slug may only contain a-z, 0-9 and -'),
  description: z.string().max(20_000).optional(),
  price: money.positive('Price must be greater than 0'),
  comparePrice: money.nullable().optional(),
  stock: z.number().int().min(0).default(0),
  categoryId: objectId,
  images: z
    .array(z.object({ url: z.string().url(), publicId: z.string().optional() }))
    .max(10)
    .optional(),
  colors: z.array(z.object({ name: trimmed.min(1).max(50), hexCode: trimmed.max(20) })).max(30).optional(),
  sizes: z.array(z.object({ name: trimmed.min(1).max(50) })).max(30).optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
});

export const categoryUpdateSchema = z
  .object({
    name: trimmed.min(1).max(100),
    slug: trimmed.min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug may only contain a-z, 0-9 and -'),
    description: z.string().max(2_000).nullable(),
    image: z.string().url().nullable(),
    parentId: objectId.nullable(),
    isActive: z.boolean(),
  })
  .partial();

export const userRoleSchema = z.object({
  role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN']),
});

/** Longest single chat message the assistant will accept. */
export const MAX_CHAT_MESSAGE_CHARS = 2_000;
