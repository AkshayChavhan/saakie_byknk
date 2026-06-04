import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const wishlistInclude = {
  items: {
    include: {
      product: {
        include: { images: { take: 1 }, category: true },
      },
    },
  },
} as const;

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

    const { productId } = await request.json();

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

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

    const item = await prisma.wishlistItem.create({
      data: { wishlistId: wishlist.id, productId },
    });

    // The client toggles optimistically and doesn't use the full wishlist here,
    // so skip the extra hydrated re-fetch (saves a slow round-trip).
    return NextResponse.json({ success: true, item }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
