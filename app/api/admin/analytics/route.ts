import { NextResponse } from 'next/server';
import { requireAuth, requireSuperAdmin } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';
import { getUmamiShareUrl } from '@/lib/analytics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET — send a SUPER_ADMIN to the Umami dashboard.
 *
 * The share link lets anyone who holds it read the traffic stats, and this
 * repository is public, so the link lives only in the `UMAMI_SHARE_URL`
 * environment variable and is revealed here after the SUPER_ADMIN check (an ADMIN is refused).
 */
export async function GET() {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const guard = requireSuperAdmin(r);
    if (guard) return guard;

    const url = getUmamiShareUrl();
    if (!url) {
      return NextResponse.json(
        { error: 'Analytics link is not configured. Set UMAMI_SHARE_URL.' },
        { status: 404 }
      );
    }

    const res = NextResponse.redirect(url);
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (error) {
    return apiError(error);
  }
}
