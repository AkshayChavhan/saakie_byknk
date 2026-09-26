import { NextResponse } from 'next/server';
import { getStoreSettings } from '@/lib/server/settings';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET — the customer-safe subset of the store settings.
 *
 * The cart summary and checkout page read this so the totals they show match
 * what the server will charge. Nothing here is secret, and it must not be
 * cached: an admin flipping shipping off should show on the next page load.
 */
export async function GET() {
  try {
    const settings = await getStoreSettings();
    return NextResponse.json(
      { shippingEnabled: settings.shippingEnabled },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return apiError(error);
  }
}
