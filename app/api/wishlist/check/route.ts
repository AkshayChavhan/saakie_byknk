import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET ?productId= — `{ inWishlist }` for one product. The product page used
 * to download the whole wishlist (every item with its product and image) to
 * colour one heart icon.
 */
export async function GET(request: Request) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;

    const productId = new URL(request.url).searchParams.get('productId') ?? '';
    if (!/^[a-f\d]{24}$/i.test(productId)) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    const count = await prisma.wishlistItem.count({
      where: { productId, wishlist: { userId: r.id } },
    });
    return NextResponse.json({ inWishlist: count > 0 });
  } catch (error) {
    return apiError(error);
  }
}
