import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Submit a product review.
 *
 * Any signed-in user may submit. New reviews are created PENDING and only
 * appear publicly once an admin approves them. A review is flagged
 * `isVerified` when the user has an order containing the product. One review
 * per user per product.
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

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // One review per user per product.
    const existing = await prisma.review.findFirst({
      where: { userId: r.id, productId },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'You have already reviewed this product' },
        { status: 409 }
      );
    }

    // Verified purchase: the user has an order item for this product.
    const purchased = await prisma.orderItem.findFirst({
      where: { productId, order: { userId: r.id } },
      select: { id: true },
    });

    const review = await prisma.review.create({
      data: {
        userId: r.id,
        productId,
        rating,
        title,
        comment,
        isVerified: !!purchased,
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
