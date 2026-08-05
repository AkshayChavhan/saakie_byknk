import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';
import { getReviewEligibility } from '@/lib/server/reviews';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/reviews/eligibility?productId=… — may the signed-in user review this
 * product? Lets the product page show the review form only to paid purchasers
 * instead of letting them write one and be rejected on submit. The POST route
 * enforces the same rules; this is presentation only.
 */
export async function GET(request: Request) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;

    const productId = new URL(request.url).searchParams.get('productId')?.trim();
    if (!productId) {
      return NextResponse.json({ error: 'Product is required' }, { status: 400 });
    }

    const eligibility = await getReviewEligibility(r.id, productId);
    return NextResponse.json(eligibility);
  } catch (error) {
    return apiError(error);
  }
}
