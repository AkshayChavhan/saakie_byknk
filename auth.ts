import 'server-only';
import { auth as clerkAuth, clerkClient } from '@clerk/nextjs/server';
import {
  findLinkedUserId,
  identityFromUser,
  linkClerkUser,
} from '@/lib/server/clerk-users';

/**
 * Server-side session, backed by Clerk.
 *
 * This file is the server half of the auth seam (the client half is
 * lib/auth-client.ts). It keeps the exact contract the Auth.js version had —
 * `auth()` resolves to `{ user: { id } }` with the STORE user's id, or null —
 * so `requireAuth()` / `optionalAuth()` in lib/server/auth.ts and every route
 * built on them are untouched by the choice of provider. Going back to Auth.js
 * means restoring this file from the `authjs-before-clerk` tag; see
 * docs/AUTHENTICATION.md.
 */
export interface Session {
  user: { id: string };
}

// Clerk id → store user id. The link never changes once made, so a warm
// server instance can skip the lookup and keep `requireAuth()` at the single
// user query it has always cost. Short-lived so a relinked account catches up.
const LINK_TTL_MS = 5 * 60 * 1000;
const LINK_CACHE_MAX = 5000;
const linkCache = new Map<string, { id: string; expires: number }>();

function remember(clerkId: string, id: string) {
  if (linkCache.size >= LINK_CACHE_MAX) linkCache.clear();
  linkCache.set(clerkId, { id, expires: Date.now() + LINK_TTL_MS });
}

/**
 * The signed-in user's session, or null when signed out.
 *
 * Requires `clerkMiddleware()` to have run on the request (middleware.ts
 * matches every page and API route). The first request from a Clerk user the
 * store has not seen links them to their existing account by verified email,
 * or creates one — so sign-up works even before the Clerk webhook is wired.
 */
export async function auth(): Promise<Session | null> {
  const { userId: clerkId } = await clerkAuth();
  if (!clerkId) return null;

  const cached = linkCache.get(clerkId);
  if (cached && cached.expires > Date.now()) return { user: { id: cached.id } };

  let id = await findLinkedUserId(clerkId);
  if (!id) {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(clerkId);
    id = await linkClerkUser(identityFromUser(clerkUser));
  }
  // Signed in to Clerk but without a verified email: no store account yet.
  if (!id) return null;

  remember(clerkId, id);
  return { user: { id } };
}
