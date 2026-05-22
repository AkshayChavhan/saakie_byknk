import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireAdmin } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
      monthlyOrders,
      newUsersThisMonth,
      activeUsers,
      topProducts,
      recentOrders,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.product.count({ where: { stock: { lte: 10 }, isActive: true } }),
      prisma.order.findMany({
        where: {
          createdAt: { gte: startOfMonth },
          paymentStatus: 'PAID',
        },
        select: { total: true },
      }),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      // Active users = users who have placed at least one order.
      prisma.user.count({ where: { orders: { some: {} } } }),
      // Top products = best sellers by number of order items.
      prisma.product.findMany({
        take: 5,
        orderBy: { orderItems: { _count: 'desc' } },
        select: {
          id: true,
          name: true,
          price: true,
          stock: true,
          images: { select: { url: true }, take: 1 },
          _count: { select: { orderItems: true } },
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

    const totalRevenue = await prisma.order.aggregate({
      where: { paymentStatus: 'PAID' },
      _sum: { total: true },
    });

    const monthlyRevenue = monthlyOrders.reduce((sum, order) => sum + order.total, 0);

    // Flat response — the admin dashboard page reads every field off the
    // top level (`setStats(data)`).
    return NextResponse.json({
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue: totalRevenue._sum.total || 0,
      monthlyRevenue,
      pendingOrders,
      lowStockProducts,
      newUsersThisMonth,
      activeUsers,
      topProducts,
      recentOrders,
    });
  } catch (error) {
    return apiError(error);
  }
}
