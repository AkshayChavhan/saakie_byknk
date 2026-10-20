import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireAdmin } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';
import { markProduct } from '@/lib/server/watermark';
import { IMAGE_ORDER } from '@/lib/server/image-order';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Dashboard statistics. Every number is an aggregate the database computes;
 * nothing loads order rows just to add them up in JavaScript, and the eleven
 * reads run as one batch.
 */
export async function GET() {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const admin = requireAdmin(r);
    if (admin) return admin;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      totalProducts,
      totalOrders,
      pendingOrders,
      lowStockProducts,
      monthlyRevenue,
      totalRevenue,
      newUsersThisMonth,
      activeUsersRaw,
      topProducts,
      recentOrders,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.product.count({ where: { stock: { lte: 10 }, isActive: true } }),
      prisma.order.aggregate({
        where: { createdAt: { gte: startOfMonth }, paymentStatus: 'PAID' },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: { paymentStatus: 'PAID' },
        _sum: { total: true },
      }),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      // Active users = distinct customers with at least one order. Counted in
      // the database rather than through a relation filter over every user.
      prisma.order.aggregateRaw({
        pipeline: [
          { $match: { userId: { $ne: null } } },
          { $group: { _id: '$userId' } },
          { $count: 'n' },
        ],
      }),
      // Top products = best sellers by units sold. `salesCount` is maintained
      // by payment settlement, so this is an indexed sort, not a join.
      prisma.product.findMany({
        take: 5,
        orderBy: { salesCount: 'desc' },
        select: {
          id: true,
          name: true,
          price: true,
          stock: true,
          salesCount: true,
          images: { select: { url: true }, take: 1, orderBy: IMAGE_ORDER },
        },
      }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
        },
      }),
    ]);

    const activeUsers = Number(
      (activeUsersRaw as unknown as Array<{ n?: number }> | null)?.[0]?.n ?? 0
    );

    // Flat response — the admin dashboard page reads every field off the
    // top level (`setStats(data)`). `_count.orderItems` is kept for the
    // existing "units sold" column.
    return NextResponse.json({
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue: totalRevenue._sum.total || 0,
      monthlyRevenue: monthlyRevenue._sum.total || 0,
      pendingOrders,
      lowStockProducts,
      newUsersThisMonth,
      activeUsers,
      topProducts: topProducts.map((p) => markProduct({ ...p, _count: { orderItems: p.salesCount } })),
      recentOrders,
    });
  } catch (error) {
    return apiError(error);
  }
}
