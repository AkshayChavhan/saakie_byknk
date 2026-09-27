import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { apiError } from '@/lib/server/errors';
import { clientIp, rateLimit } from '@/lib/server/rate-limit';
import { isDeliveryFailure, sendVerificationEmail } from '@/lib/server/email';
import {
  createVerificationToken,
  deleteVerificationTokens,
  pendingTokenAgeMs,
  verificationUrl,
} from '@/lib/server/verification';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RESEND_LIMIT = 5; // per IP
const RESEND_WINDOW_MS = 15 * 60 * 1000;
// Swallow repeats while a just-issued link is seconds old (double clicks).
const MIN_REISSUE_AGE_MS = 60 * 1000;

/**
 * POST /api/auth/resend-verification — re-send the signup confirmation link.
 *
 * Always answers with the same generic success body so the endpoint cannot be
 * used to probe which email addresses have accounts.
 */
export async function POST(request: Request) {
  try {
    const { allowed, retryAfter } = rateLimit(
      `resend-verification:${clientIp(request)}`,
      RESEND_LIMIT,
      RESEND_WINDOW_MS,
      Date.now()
    );
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const body = await request.json().catch(() => null);
    const email =
      body && typeof body.email === 'string'
        ? body.email.trim().toLowerCase()
        : '';
    if (!email) {
      return NextResponse.json(
        { error: 'An email address is required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { name: true, emailVerified: true },
    });

    // Only unverified accounts get a fresh link — and not more than once a
    // minute. Every other case falls through to the generic success response.
    let failed = false;
    if (user && !user.emailVerified) {
      const age = await pendingTokenAgeMs(email);
      if (age === null || age >= MIN_REISSUE_AGE_MS) {
        const token = await createVerificationToken(email);
        const result = await sendVerificationEmail({
          to: email,
          name: user.name,
          verifyUrl: verificationUrl(request, token),
        });
        failed = isDeliveryFailure(result);
        if (failed) await deleteVerificationTokens(email);
      }
    }

    // A delivery failure is reported, because claiming "a new link is on its
    // way" when the provider refused the message is how this bug stayed
    // invisible. The cause is always global (unverified sender domain, bad
    // creds, unreachable host), never specific to one address, so the message
    // stays generic. It does narrow the anti-probing guarantee above: a 503
    // implies an unverified account exists. That only holds while mail is
    // already broken store-wide, which is the right moment to be loud.
    if (failed) {
      return NextResponse.json(
        {
          success: false,
          error:
            'We could not send the confirmation email just now. Please try again shortly or contact support.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        'If an unverified account exists for this address, a new confirmation link has been sent.',
    });
  } catch (error) {
    return apiError(error);
  }
}
