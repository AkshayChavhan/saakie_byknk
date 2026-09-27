import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { apiError } from '@/lib/server/errors';
import { isDeliveryFailure, sendVerificationEmail } from '@/lib/server/email';
import {
  createVerificationToken,
  deleteVerificationTokens,
  verificationUrl,
} from '@/lib/server/verification';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Email + password registration.
 *
 * Auth.js has no built-in sign-up for the Credentials provider, so this route
 * creates the user. It mirrors what the old Clerk `user.created` webhook did:
 * create the User, then its Cart and Wishlist. The account starts unverified
 * (`emailVerified: null`) and a confirmation link is emailed; `authorize()` in
 * auth.ts refuses to sign in unverified users, so the client shows a
 * "check your email" screen instead of signing in directly.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const email =
      typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const name =
      typeof body.name === 'string' && body.name.trim() ? body.name.trim() : null;

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: 'A valid email address is required' },
        { status: 400 }
      );
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: 'USER',
      },
      select: { id: true, email: true, name: true },
    });

    // Mirror the old Clerk webhook: every user gets a cart and wishlist.
    await Promise.all([
      prisma.cart.create({ data: { userId: user.id } }),
      prisma.wishlist.create({ data: { userId: user.id } }),
    ]);

    // Email the confirmation link. A send failure must not orphan the freshly
    // created account (re-registering would hit the 409), so we keep the account
    // and report the outcome instead: `emailSent: false` tells the client to say
    // the link could not be sent rather than "check your email", which is what
    // previously turned a misconfigured sender into a silent dead end.
    let emailSent = false;
    try {
      const token = await createVerificationToken(email);
      const result = await sendVerificationEmail({
        to: email,
        name,
        verifyUrl: verificationUrl(request, token),
      });
      emailSent = !isDeliveryFailure(result);
      // Nothing was delivered, so this token must not sit there looking freshly
      // issued — it would make the customer's immediate "retry" a silent no-op.
      if (!emailSent) await deleteVerificationTokens(email);
    } catch (emailError) {
      // Only token creation can land here; the send itself never throws.
      console.error('[register] failed to issue verification token:', emailError);
    }

    return NextResponse.json(
      { success: true, requiresVerification: true, emailSent, user },
      { status: 201 }
    );
  } catch (error) {
    // Unique-constraint race: another request created the email concurrently.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }
    return apiError(error);
  }
}
