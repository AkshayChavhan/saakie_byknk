import { NextResponse } from 'next/server';
import { apiError } from '@/lib/server/errors';
import { getStoreSettings } from '@/lib/server/settings';

export const runtime = 'nodejs';
// Never cached: an admin flipping a switch must reach the storefront at once,
// and this app has no revalidatePath/revalidateTag anywhere to purge with.
export const dynamic = 'force-dynamic';

/**
 * Public read of the store-wide switches, used by checkout to decide which
 * payment channels to offer. Advisory only — the order routes re-check
 * server-side, so a stale or forged client value cannot place a blocked order.
 *
 * Fields are picked explicitly so a future admin-only setting is not exposed
 * to the storefront by accident.
 */
export async function GET() {
  try {
    const { codEnabled } = await getStoreSettings();
    return NextResponse.json({ codEnabled });
  } catch (error) {
    return apiError(error);
  }
}
