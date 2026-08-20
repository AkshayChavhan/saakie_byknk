import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { apiError } from '@/lib/server/errors';
import { clientIp, rateLimit } from '@/lib/server/rate-limit';
import { sendVerificationEmail } from '@/lib/server/email';
import {
  createVerificationToken,
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
    if (user && !user.emailVerified) {
      const age = await pendingTokenAgeMs(email);
      if (age === null || age >= MIN_REISSUE_AGE_MS) {
        const token = await createVerificationToken(email);
        await sendVerificationEmail({
          to: email,
          name: user.name,
          verifyUrl: verificationUrl(request, token),
        });
      }
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
