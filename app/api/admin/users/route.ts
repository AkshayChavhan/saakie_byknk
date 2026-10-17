import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireAdmin } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';
import { parseLimit, parsePage } from '@/lib/server/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const admin = requireAdmin(r);
    if (admin) return admin;

    const { searchParams } = new URL(request.url);
    const pageNum = parsePage(searchParams.get('page'));
    const limitNum = parseLimit(searchParams.get('limit'), 20);
    const search = searchParams.get('search');
    const role = searchParams.get('role');

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role && ['USER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) where.role = role;

    const [users, totalCount, byRole, orders] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          imageUrl: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { orders: true, reviews: true } },
        },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
      // Whole-directory figures for the summary cards, independent of filters.
      prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      prisma.order.count(),
    ]);

    const stats = { total: 0, USER: 0, ADMIN: 0, SUPER_ADMIN: 0, orders } as Record<string, number>;
    for (const row of byRole) {
      stats[row.role] = row._count._all;
      stats.total += row._count._all;
    }

    return NextResponse.json({
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
      stats,
    });
  } catch (error) {
    return apiError(error);
  }
}
