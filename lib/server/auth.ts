import 'server-only';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export interface AuthedUser {
  id: string;
  clerkId: string;
  email: string;
  name: string | null;
  imageUrl: string | null;
  role: string;
}

const userSelect = {
  id: true,
  clerkId: true,
  email: true,
  name: true,
  imageUrl: true,
  role: true,
} as const;

function unauthorized(message: string, code: string): NextResponse {
  return NextResponse.json(
    { success: false, error: { message, code } },
    { status: 401 }
  );
}

function forbidden(message: string, code: string): NextResponse {
  return NextResponse.json(
    { success: false, error: { message, code } },
    { status: 403 }
  );
}

function notFound(message: string, code: string): NextResponse {
  return NextResponse.json(
    { success: false, error: { message, code } },
    { status: 404 }
  );
}

/**
 * Require an authenticated user. Returns the AuthedUser, or a NextResponse to
 * be returned directly from the route handler on failure.
 *
 * Usage:
 *   const r = await requireAuth();
 *   if (r instanceof NextResponse) return r;
 *   const user = r;
 */
export async function requireAuth(): Promise<AuthedUser | NextResponse> {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return unauthorized('Unauthorized - No session', 'NO_TOKEN');
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: userSelect,
    });

    if (!user) {
      return notFound('User not found', 'USER_NOT_FOUND');
    }

    return user;
  } catch (error) {
    console.error('requireAuth error:', error);
    return unauthorized('Unauthorized', 'AUTH_ERROR');
  }
}

/**
 * Optional auth - returns the AuthedUser if signed in, otherwise null. Never
 * returns an error response.
 */
export async function optionalAuth(): Promise<AuthedUser | null> {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return null;

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: userSelect,
    });

    return user ?? null;
  } catch {
    return null;
  }
}

export function requireAdmin(user: AuthedUser): NextResponse | null {
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    return forbidden('Forbidden - Admin access required', 'NOT_ADMIN');
  }
  return null;
}

export function requireSuperAdmin(user: AuthedUser): NextResponse | null {
  if (user.role !== 'SUPER_ADMIN') {
    return forbidden('Forbidden - Super Admin access required', 'NOT_SUPER_ADMIN');
  }
  return null;
}
