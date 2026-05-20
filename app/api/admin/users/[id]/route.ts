import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireAdmin, requireSuperAdmin } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    return NextResponse.json(user);
  } catch (error) {
    return apiError(error);
  }
}

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
    const { role } = await request.json();

    if (!['USER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    if (role === 'SUPER_ADMIN' && r.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Only super admin can promote to super admin' },
        { status: 403 }
      );
    }

    const user = await prisma.user.update({ where: { id }, data: { role } });
    return NextResponse.json(user);
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

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    return apiError(error);
  }
}
