import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET — every review written by the signed-in user, across all products, with
 * enough product info to link back to the product page. Most recent first.
 */
export async function GET() {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;

    const reviews = await prisma.review.findMany({
      where: { userId: r.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        rating: true,
        title: true,
        comment: true,
        status: true,
        createdAt: true,
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: { select: { url: true }, take: 1 },
          },
        },
      },
    });

    const formatted = reviews.map((rev) => ({
      id: rev.id,
      rating: rev.rating,
      title: rev.title,
      comment: rev.comment,
      status: rev.status,
      createdAt: rev.createdAt,
      product: rev.product
        ? {
            id: rev.product.id,
            name: rev.product.name,
            slug: rev.product.slug,
            image: rev.product.images[0]?.url || '/images/placeholder-product.svg',
          }
        : null,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    return apiError(error);
  }
}
