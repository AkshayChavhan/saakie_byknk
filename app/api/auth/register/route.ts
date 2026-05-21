import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Email + password registration.
 *
 * Auth.js has no built-in sign-up for the Credentials provider, so this route
 * creates the user. It mirrors what the old Clerk `user.created` webhook did:
 * create the User, then its Cart and Wishlist. The client signs the user in
 * (via `signIn('credentials', ...)`) after a successful response.
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

    return NextResponse.json({ success: true, user }, { status: 201 });
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
