import { NextResponse } from 'next/server';
import { apiError } from '@/lib/server/errors';
import { loadCategoryCards } from '@/lib/server/storefront';

export const runtime = 'nodejs';
export const revalidate = 60;

/** Top-level category cards. The home page reads `loadCategoryCards` directly. */
export async function GET() {
  try {
    return NextResponse.json(await loadCategoryCards());
  } catch (error) {
    return apiError(error);
  }
}
