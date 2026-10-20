import type { Prisma } from '@prisma/client';

/**
 * The one ordering for a product's images, used by every query that loads
 * them: the main image (image 1 in the admin's sequence) first, then by the
 * saved position. Rows saved before positions existed all have order 0, and
 * for those the primary flag alone decides which photo leads.
 */
export const IMAGE_ORDER = [
  { isPrimary: 'desc' },
  { order: 'asc' },
] satisfies Prisma.ImageOrderByWithRelationInput[];
