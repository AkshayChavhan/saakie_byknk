import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';
import { validateBody, wishlistAddSchema } from '@/lib/server/validation';
import { isUniqueViolation } from '@/lib/server/prisma-errors';
import { wishlistInclude } from '@/lib/server/wishlist';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


export async function GET() {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;

    let wishlist = await prisma.wishlist.findUnique({
      where: { userId: r.id },
      include: wishlistInclude,
    });

    if (!wishlist) {
      wishlist = await prisma.wishlist.create({
        data: { userId: r.id },
        include: wishlistInclude,
      });
    }

    return NextResponse.json(wishlist);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;

    const parsed = validateBody(wishlistAddSchema, await request.json().catch(() => null));
    if (parsed instanceof NextResponse) return parsed;
    const { productId } = parsed;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    let wishlist = await prisma.wishlist.findUnique({ where: { userId: r.id } });
    if (!wishlist) {
      wishlist = await prisma.wishlist.create({ data: { userId: r.id } });
    }

    const existingItem = await prisma.wishlistItem.findFirst({
      where: { wishlistId: wishlist.id, productId },
    });

    if (existingItem) {
      return NextResponse.json({ error: 'Product already in wishlist' }, { status: 400 });
    }

    // The pre-check above is racy; the unique index on wishlistId+productId
    // is what actually guarantees one entry, so treat its violation as the
    // same "already there" answer.
    let item;
    try {
      item = await prisma.wishlistItem.create({
        data: { wishlistId: wishlist.id, productId },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return NextResponse.json({ error: 'Product already in wishlist' }, { status: 400 });
      }
      throw error;
    }

    // The client toggles optimistically and doesn't use the full wishlist here,
    // so skip the extra hydrated re-fetch (saves a slow round-trip).
    return NextResponse.json({ success: true, item }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
