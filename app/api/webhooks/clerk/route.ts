import { NextResponse, type NextRequest } from 'next/server';
import { verifyWebhook } from '@clerk/nextjs/webhooks';
import {
  identityFromJSON,
  linkClerkUser,
  syncClerkUser,
  unlinkClerkUser,
} from '@/lib/server/clerk-users';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Clerk → store user sync (signature-verified with
 * `CLERK_WEBHOOK_SIGNING_SECRET`).
 *
 * Sign-in does not depend on this route: `auth()` links or creates the store
 * user on the first authenticated request. The webhook covers what a request
 * cannot see — an email address changed in Clerk, and a deleted Clerk user.
 */
export async function POST(request: NextRequest) {
  let event;
  try {
    event = await verifyWebhook(request);
  } catch (error) {
    console.error('[clerk webhook] verification failed:', error);
    return NextResponse.json({ error: 'Webhook verification failed' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'user.created':
        await linkClerkUser(identityFromJSON(event.data));
        break;
      case 'user.updated':
        await syncClerkUser(identityFromJSON(event.data));
        break;
      case 'user.deleted':
        if (event.data.id) await unlinkClerkUser(event.data.id);
        break;
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    // A 5xx makes Clerk retry the delivery, which is what a database blip needs.
    console.error(`[clerk webhook] ${event.type} failed:`, error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
