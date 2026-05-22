import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireAdmin } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * List reviews for moderation. Supports filtering by status, rating, and
 * product, with pagination.
 */
export async function GET(request: Request) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const admin = requireAdmin(r);
    if (admin) return admin;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const rating = searchParams.get('rating');
    const productId = searchParams.get('productId');
    const pageNum = parseInt(searchParams.get('page') ?? '1');
    const limitNum = parseInt(searchParams.get('limit') ?? '20');

    const where: {
      status?: 'PENDING' | 'APPROVED' | 'REJECTED';
      rating?: number;
      productId?: string;
    } = {};
    if (status === 'PENDING' || status === 'APPROVED' || status === 'REJECTED') {
      where.status = status;
    }
    if (rating) {
      const ratingNum = parseInt(rating);
      if (ratingNum >= 1 && ratingNum <= 5) where.rating = ratingNum;
    }
    if (productId) where.productId = productId;

    const [reviews, totalCount, pendingCount] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: { select: { name: true, email: true } },
          product: { select: { name: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.review.count({ where }),
      prisma.review.count({ where: { status: 'PENDING' } }),
    ]);

    return NextResponse.json({
      reviews,
      pendingCount,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
