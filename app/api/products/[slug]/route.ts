import { NextResponse } from 'next/server';
import { apiError } from '@/lib/server/errors';
import { loadProductDetail } from '@/lib/server/products';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Product detail. The product page renders `loadProductDetail` on the server;
 * this route serves client-side refreshes (for example after a review).
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const product = await loadProductDetail(slug);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (error) {
    return apiError(error);
  }
}
