import { NextResponse } from 'next/server';
import { apiError } from '@/lib/server/errors';
import { loadPromotionalData } from '@/lib/server/storefront';

export const runtime = 'nodejs';
export const revalidate = 60;

export async function GET() {
  try {
    return NextResponse.json(await loadPromotionalData());
  } catch (error) {
    return apiError(error);
  }
}
