import 'server-only';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

/**
 * Review eligibility — only customers who have paid for a product may review it.
 *
 * An order counts as paid solely on `paymentStatus: PAID` — gateway capture, or
 * an admin marking it paid via PATCH /api/admin/orders/[id]. PENDING / FAILED /
 * CANCELLED / REFUNDED do not qualify: a refunded order is money returned, not
 * money paid.
 */
export const PAID_ORDER_FILTER: Prisma.OrderWhereInput = {
  paymentStatus: 'PAID',
};

/** Whether the user has a paid order containing this product. */
export async function hasPaidForProduct(
  userId: string,
  productId: string
): Promise<boolean> {
  const item = await prisma.orderItem.findFirst({
    where: { productId, order: { userId, ...PAID_ORDER_FILTER } },
    select: { id: true },
  });
  return item !== null;
}

export type ReviewEligibilityReason =
  | 'OK'
  | 'ALREADY_REVIEWED'
  | 'NOT_PURCHASED'
  | 'PRODUCT_NOT_FOUND';

export interface ReviewEligibility {
  canReview: boolean;
  reason: ReviewEligibilityReason;
  message: string;
}

const MESSAGES: Record<ReviewEligibilityReason, string> = {
  OK: 'You can review this product.',
  ALREADY_REVIEWED: 'You have already reviewed this product',
  NOT_PURCHASED:
    'Only customers who have purchased this product can review it. Reviews unlock once your payment for it is confirmed.',
  PRODUCT_NOT_FOUND: 'Product not found',
};

/**
 * Resolve whether a user may review a product: the product must exist, the user
 * must have paid for it, and may only review it once.
 */
export async function getReviewEligibility(
  userId: string,
  productId: string
): Promise<ReviewEligibility> {
  const [product, existing] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId }, select: { id: true } }),
    prisma.review.findFirst({
      where: { userId, productId },
      select: { id: true },
    }),
  ]);

  if (!product) return eligibility('PRODUCT_NOT_FOUND');
  if (existing) return eligibility('ALREADY_REVIEWED');

  const paid = await hasPaidForProduct(userId, productId);
  if (!paid) return eligibility('NOT_PURCHASED');

  return eligibility('OK');
}

function eligibility(reason: ReviewEligibilityReason): ReviewEligibility {
  return { canReview: reason === 'OK', reason, message: MESSAGES[reason] };
}
