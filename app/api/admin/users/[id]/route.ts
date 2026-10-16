import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireAdmin, requireSuperAdmin } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';
import { deleteClerkUser } from '@/lib/server/clerk-users';
import { userRoleSchema, validateBody } from '@/lib/server/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Strip the credential columns before a user row leaves the server. */
function publicUser<T extends { password?: unknown }>(user: T): Omit<T, 'password'> {
  const { password: _password, ...safe } = user;
  return safe;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const admin = requireAdmin(r);
    if (admin) return admin;
    const { id } = await context.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        orders: { take: 10, orderBy: { createdAt: 'desc' } },
        addresses: true,
        _count: { select: { orders: true, reviews: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(publicUser(user));
  } catch (error) {
    return apiError(error);
  }
}

/**
 * Change a user's role.
 *
 * Rules, in order:
 *  - nobody changes their own role (the UI would lock them out mid-request);
 *  - anything touching SUPER_ADMIN — granting it, or changing someone who
 *    holds it — needs a SUPER_ADMIN;
 *  - an ADMIN cannot change another ADMIN either, so admins cannot demote
 *    each other;
 *  - the last SUPER_ADMIN can never be demoted, or the store would have no
 *    one left who can manage roles or run backups.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const admin = requireAdmin(r);
    if (admin) return admin;
    const { id } = await context.params;

    const parsed = validateBody(userRoleSchema, await request.json().catch(() => null));
    if (parsed instanceof NextResponse) return parsed;
    const { role } = parsed;

    if (id === r.id) {
      return NextResponse.json({ error: 'You cannot change your own role' }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isSuperAdmin = r.role === 'SUPER_ADMIN';
    if ((role === 'SUPER_ADMIN' || target.role === 'SUPER_ADMIN') && !isSuperAdmin) {
      return NextResponse.json(
        { error: 'Only a super admin can grant or change the super admin role' },
        { status: 403 }
      );
    }
    if (target.role === 'ADMIN' && !isSuperAdmin) {
      return NextResponse.json(
        { error: "Only a super admin can change another admin's role" },
        { status: 403 }
      );
    }

    if (target.role === 'SUPER_ADMIN' && role !== 'SUPER_ADMIN') {
      const superAdmins = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } });
      if (superAdmins <= 1) {
        return NextResponse.json(
          { error: 'Cannot demote the last super admin' },
          { status: 400 }
        );
      }
    }

    const user = await prisma.user.update({ where: { id }, data: { role } });
    return NextResponse.json(publicUser(user));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const sa = requireSuperAdmin(r);
    if (sa) return sa;
    const { id } = await context.params;

    if (id === r.id) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { clerkId: true },
    });

    await prisma.user.delete({ where: { id } });

    // The store account is gone; take the sign-in with it, or the person could
    // sign straight back in and be given a fresh account. Store first, so a
    // refused delete (the user still has reviews, say) leaves both sides intact.
    if (target?.clerkId) {
      try {
        await deleteClerkUser(target.clerkId);
      } catch (error) {
        console.error(`[admin] store user ${id} deleted but Clerk user ${target.clerkId} was not:`, error);
        return NextResponse.json({
          message: 'User deleted successfully',
          warning: 'The sign-in account could not be removed from Clerk. Delete it in the Clerk dashboard.',
        });
      }
    }

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    return apiError(error);
  }
}
