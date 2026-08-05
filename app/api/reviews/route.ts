import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';
import {
  getReviewEligibility,
  type ReviewEligibilityReason,
} from '@/lib/server/reviews';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** HTTP status for each way a submission can be rejected. */
const INELIGIBLE_STATUS: Record<ReviewEligibilityReason, number> = {
  OK: 200,
  PRODUCT_NOT_FOUND: 404,
  ALREADY_REVIEWED: 409,
  NOT_PURCHASED: 403,
};

/**
 * Submit a product review.
 *
 * Only customers who have paid for the product may review it (see
 * `getReviewEligibility`), and only once per product. New reviews are created
 * PENDING and appear publicly once an admin approves them. Every accepted
 * review is a verified purchase by construction.
 */
export async function POST(request: Request) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const productId = typeof body.productId === 'string' ? body.productId : '';
    const rating = Number(body.rating);
    const title =
      typeof body.title === 'string' && body.title.trim() ? body.title.trim() : null;
    const comment =
      typeof body.comment === 'string' && body.comment.trim()
        ? body.comment.trim()
        : null;

    if (!productId) {
      return NextResponse.json({ error: 'Product is required' }, { status: 400 });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be a whole number from 1 to 5' },
        { status: 400 }
      );
    }

    // Product must exist, must have been paid for, and not already reviewed.
    const eligibility = await getReviewEligibility(r.id, productId);
    if (!eligibility.canReview) {
      return NextResponse.json(
        { error: eligibility.message, reason: eligibility.reason },
        { status: INELIGIBLE_STATUS[eligibility.reason] }
      );
    }

    const review = await prisma.review.create({
      data: {
        userId: r.id,
        productId,
        rating,
        title,
        comment,
        // Guaranteed: only paid purchasers reach this point.
        isVerified: true,
        status: 'PENDING',
      },
    });

    return NextResponse.json(
      {
        success: true,
        review: { id: review.id, status: review.status },
        message: 'Thanks! Your review will appear once it has been approved.',
      },
      { status: 201 }
    );
  } catch (error) {
    return apiError(error);
  }
}
