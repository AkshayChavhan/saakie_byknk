import 'server-only';
import { createHash, randomBytes } from 'crypto';
import prisma from '@/lib/prisma';

/**
 * Signup email-verification tokens.
 *
 * The raw token travels only inside the emailed link; the database stores its
 * SHA-256 hash, so a leaked DB dump cannot be replayed into working links.
 *
 * A token stays valid until it expires — it is NOT deleted on first use.
 * Corporate mail scanners (Outlook SafeLinks etc.) prefetch links before the
 * human clicks; a single-use token would be burned by the scanner and the real
 * click would land on "link invalid". Verifying an email is idempotent and
 * low-privilege, so multi-use within the TTL is the better trade-off.
 */

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/**
 * Issue a fresh verification token for `email` (lowercased by the caller).
 * Replaces any previous tokens for the address and opportunistically clears
 * expired rows. Returns the RAW token to embed in the link.
 */
export async function createVerificationToken(email: string): Promise<string> {
  const raw = randomBytes(32).toString('base64url');

  await prisma.verificationToken.deleteMany({
    where: {
      OR: [{ identifier: email }, { expires: { lt: new Date() } }],
    },
  });
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: hashToken(raw),
      expires: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  return raw;
}

/**
 * Look up a raw token from a confirmation link. Returns the email address it
 * verifies, or null when unknown/expired.
 */
export async function verifyToken(raw: string): Promise<string | null> {
  const record = await prisma.verificationToken.findUnique({
    where: { token: hashToken(raw) },
    select: { identifier: true, expires: true },
  });
  if (!record || record.expires < new Date()) return null;
  return record.identifier;
}

/**
 * Absolute URL for the confirmation link. Prefers the canonical
 * NEXT_PUBLIC_APP_URL (correct behind proxies); falls back to the request
 * origin so local dev works without configuration.
 */
export function verificationUrl(request: Request, rawToken: string): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '');
  const origin = configured || new URL(request.url).origin;
  return `${origin}/auth/confirm?token=${rawToken}`;
}

/**
 * How recently a pending token for `email` was issued, in ms — used by the
 * resend endpoint to swallow rapid repeats. Null when no pending token exists.
 */
export async function pendingTokenAgeMs(email: string): Promise<number | null> {
  const record = await prisma.verificationToken.findFirst({
    where: { identifier: email, expires: { gt: new Date() } },
    select: { expires: true },
  });
  if (!record) return null;
  return TOKEN_TTL_MS - (record.expires.getTime() - Date.now());
}
