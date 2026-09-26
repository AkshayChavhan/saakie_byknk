import { NextResponse } from 'next/server';
import { requireAuth, requireAdmin } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';
import {
  getStoreSettings,
  updateStoreSettings,
  type StoreSettingsPatch,
} from '@/lib/server/settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET — the full store settings for the admin Settings page. */
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
 * PATCH — change one or more settings. Body: `{ shippingEnabled?: boolean }`.
 * Each field is type-checked so a stray string from a form cannot end up as
 * a truthy "switch on".
 */
export async function PATCH(request: Request) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const admin = requireAdmin(r);
    if (admin) return admin;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const patch: StoreSettingsPatch = {};
    if ('shippingEnabled' in body) {
      if (typeof body.shippingEnabled !== 'boolean') {
        return NextResponse.json(
          { error: 'shippingEnabled must be true or false' },
          { status: 400 }
        );
      }
      patch.shippingEnabled = body.shippingEnabled;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    return NextResponse.json(await updateStoreSettings(patch));
  } catch (error) {
    return apiError(error);
  }
}
