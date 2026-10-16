import { NextResponse } from 'next/server';
import { apiError } from '@/lib/server/errors';
import { loadHeroSlides } from '@/lib/server/storefront';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Public hero slides for the homepage carousel. The home page itself reads
 * `loadHeroSlides` on the server; this route serves client-side refreshes.
 */
export async function GET() {
  try {
    return NextResponse.json(await loadHeroSlides());
  } catch (error) {
    return apiError(error);
  }
}
