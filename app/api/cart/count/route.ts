import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';
import { getCartItemCount } from '@/lib/server/cart';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET — `{ itemCount }` for the header badge. The badge is mounted on every
 * page, and it used to download the whole cart (every line with its product,
 * images, colours and sizes) to show one number.
 */
export async function GET() {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    return NextResponse.json({ itemCount: await getCartItemCount(r.id) });
  } catch (error) {
    return apiError(error);
  }
}
