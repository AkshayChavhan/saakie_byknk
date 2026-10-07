import 'server-only';
import { Prisma } from '@prisma/client';
import { clerkClient } from '@clerk/nextjs/server';
import type { User as ClerkUser, UserJSON } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

/**
 * Bridge between Clerk (who the visitor is) and the store's own `User`
 * collection (everything they own: cart, wishlist, orders, addresses, role).
 *
 * Clerk holds the credentials and the email address. MongoDB stays the main
 * record and keeps its ids, so nothing that hangs off a user moves — which is
 * also what keeps the way back to Auth.js open. The only thing added to a user
 * is `clerkId`.
 */

/** The parts of a Clerk user this app reads, whichever API they arrived by. */
export interface ClerkIdentity {
  clerkId: string;
  /** Primary email address, lower-cased. Null when the user has none. */
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  /** Null unless the user uploaded a photo — Clerk's generated avatar is skipped. */
  imageUrl: string | null;
}

function fullName(first: string | null, last: string | null): string | null {
  return [first, last].filter(Boolean).join(' ').trim() || null;
}

/** From the Backend API (`clerkClient().users.getUser`). */
export function identityFromUser(user: ClerkUser): ClerkIdentity {
  const primary = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId);
  return {
    clerkId: user.id,
    email: primary?.emailAddress.trim().toLowerCase() || null,
    emailVerified: primary?.verification?.status === 'verified',
    name: fullName(user.firstName, user.lastName),
    imageUrl: user.hasImage ? user.imageUrl : null,
  };
}

/** From a `user.created` / `user.updated` webhook payload. */
export function identityFromJSON(data: UserJSON): ClerkIdentity {
  const primary = data.email_addresses.find((e) => e.id === data.primary_email_address_id);
  return {
    clerkId: data.id,
    email: primary?.email_address.trim().toLowerCase() || null,
    emailVerified: primary?.verification?.status === 'verified',
    name: fullName(data.first_name, data.last_name),
    imageUrl: data.has_image ? data.image_url : null,
  };
}

/** The store user already linked to this Clerk user, if any. */
export async function findLinkedUserId(clerkId: string): Promise<string | null> {
  const user = await prisma.user.findFirst({
    where: { clerkId },
    select: { id: true },
  });
  return user?.id ?? null;
}

/**
 * Resolve a Clerk user to a store user, linking or creating one on first sight.
 * Returns the store user's id, or null when the Clerk user cannot be trusted
 * with an account yet.
 *
 * Runs from two places — the first authenticated request (`auth()` in auth.ts)
 * and the Clerk webhook — so it is idempotent and safe to race with itself.
 *
 *  1. Already linked            → that user.
 *  2. Same email, not linked    → link it. This is how every pre-Clerk account
 *                                 keeps its orders, addresses and role.
 *  3. Nobody with that email    → create the user with a cart and wishlist.
 */
export async function linkClerkUser(identity: ClerkIdentity): Promise<string | null> {
  const linkedId = await findLinkedUserId(identity.clerkId);
  if (linkedId) return linkedId;

  // Step 2 hands an existing account — possibly an admin's — to whoever holds
  // this email, so the address must be one Clerk has actually verified.
  if (!identity.email || !identity.emailVerified) return null;
  const email = identity.email;

  // Case-insensitive: accounts from before emails were normalised may be stored
  // with capitals, and missing one here would fork the customer's history into
  // a second, empty account.
  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true, clerkId: true, emailVerified: true, name: true, imageUrl: true },
  });

  if (existing) {
    if (existing.clerkId && existing.clerkId !== identity.clerkId) {
      // The address is verified in the current Clerk instance, so the old link
      // is stale — a Clerk user deleted and re-created, or dev → production keys.
      console.warn(
        `[clerk] relinking ${email}: was ${existing.clerkId}, now ${identity.clerkId}`
      );
    }
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        clerkId: identity.clerkId,
        emailVerified: existing.emailVerified ?? new Date(),
        name: existing.name ?? identity.name,
        imageUrl: existing.imageUrl ?? identity.imageUrl,
      },
    });
    return existing.id;
  }

  try {
    const user = await prisma.user.create({
      data: {
        clerkId: identity.clerkId,
        email,
        emailVerified: new Date(),
        name: identity.name,
        imageUrl: identity.imageUrl,
        role: 'USER',
      },
      select: { id: true },
    });
    // Every user gets a cart and a wishlist, as registration always did.
    await Promise.all([
      prisma.cart.create({ data: { userId: user.id } }),
      prisma.wishlist.create({ data: { userId: user.id } }),
    ]);
    return user.id;
  } catch (error) {
    // Lost a race with a parallel first request (or the webhook) for the same
    // person: the unique email index let only one create through.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const winner = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      return winner?.id ?? null;
    }
    throw error;
  }
}

/**
 * Apply a `user.updated` webhook. Clerk owns the email address; the store owns
 * the profile, so a name or photo the customer set on their account page is
 * never overwritten — Clerk's copy only fills a blank.
 */
export async function syncClerkUser(identity: ClerkIdentity): Promise<void> {
  const id = await linkClerkUser(identity);
  if (!id) return;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { email: true, name: true, imageUrl: true },
  });
  if (!user) return;

  const data: { email?: string; name?: string; imageUrl?: string } = {};
  if (identity.email && identity.emailVerified && identity.email !== user.email.toLowerCase()) {
    data.email = identity.email;
  }
  if (!user.name && identity.name) data.name = identity.name;
  if (!user.imageUrl && identity.imageUrl) data.imageUrl = identity.imageUrl;
  if (Object.keys(data).length === 0) return;

  try {
    await prisma.user.update({ where: { id }, data });
  } catch (error) {
    // The new address already belongs to another store account. Leave both
    // untouched rather than merge two people's order history automatically.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      console.error(`[clerk] cannot move ${identity.clerkId} to ${data.email}: address in use`);
      return;
    }
    throw error;
  }
}

/**
 * Apply a `user.deleted` webhook. Only the sign-in is detached: the store user
 * and its orders stay, because order records outlive the account. Signing up
 * again with the same email links straight back to them.
 */
export async function unlinkClerkUser(clerkId: string): Promise<void> {
  await prisma.user.updateMany({ where: { clerkId }, data: { clerkId: null } });
}

/**
 * Remove the Clerk side of an account an admin has deleted from the store.
 * Without this the person could sign in again and be handed a fresh account.
 * A user Clerk no longer knows counts as done.
 */
export async function deleteClerkUser(clerkId: string): Promise<void> {
  try {
    const client = await clerkClient();
    await client.users.deleteUser(clerkId);
  } catch (error) {
    if ((error as { status?: number })?.status === 404) return;
    throw error;
  }
}
