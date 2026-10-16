import { NextResponse } from 'next/server';
import { apiError } from '@/lib/server/errors';
import { loadFeaturedProducts } from '@/lib/server/storefront';

export const runtime = 'nodejs';
export const revalidate = 60;

/** Featured products strip. The home page reads `loadFeaturedProducts` directly. */
export async function GET() {
  try {
    return NextResponse.json(await loadFeaturedProducts());
  } catch (error) {
    return apiError(error);
  }
}
