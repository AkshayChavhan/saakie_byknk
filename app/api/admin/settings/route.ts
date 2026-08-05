import { NextResponse } from 'next/server';
import { requireAuth, requireAdmin } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';
import { getStoreSettings, updateStoreSettings, type StoreSettings } from '@/lib/server/settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Read the store-wide switches. */
export async function GET() {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const admin = requireAdmin(r);
    if (admin) return admin;

    return NextResponse.json(await getStoreSettings());
  } catch (error) {
    return apiError(error);
  }
}

/**
 * Flip one or more store-wide switches. Only real booleans are accepted — a
 * truthy string like "false" must not be able to turn a kill switch back on.
 */
export async function PATCH(request: Request) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const admin = requireAdmin(r);
    if (admin) return admin;

    // `.catch(() => ({}))` alone is not enough: a literal `null` body parses
    // fine and then throws on property access.
    const parsed = await request.json().catch(() => null);
    const body: Record<string, unknown> =
      parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    const patch: Partial<StoreSettings> = {};

    if (typeof body.codEnabled === 'boolean') patch.codEnabled = body.codEnabled;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    return NextResponse.json(await updateStoreSettings(patch, r.id));
  } catch (error) {
    return apiError(error);
  }
}
