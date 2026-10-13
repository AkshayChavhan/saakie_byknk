import { NextResponse } from 'next/server';
import { OrderStatus, PaymentStatus, type Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth, requireAdmin } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Hard ceiling on page size so a stray `?limit=100000` cannot pull the table. */
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

const ORDER_STATUSES = new Set<string>(Object.values(OrderStatus));
const PAYMENT_STATUSES = new Set<string>(Object.values(PaymentStatus));

function parsePositiveInt(raw: string | null, fallback: number): number {
  const n = parseInt(raw ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * GET /api/admin/orders — paginated order list for the admin screen.
 *
 * Filtering, search and paging all happen here rather than in the browser so
 * the page sees the whole table, not just the latest twenty rows. `search`
 * matches the order number, the customer's name or email, and the delivery
 * phone or pincode — the things an admin has in hand when a customer calls.
 *
 * `statusCounts` is over every order regardless of the active filter, so the
 * stat cards at the top of the page stay true while the table is narrowed.
 */
export async function GET(request: Request) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const admin = requireAdmin(r);
    if (admin) return admin;

    const { searchParams } = new URL(request.url);
    const pageNum = parsePositiveInt(searchParams.get('page'), 1);
    const limitNum = Math.min(MAX_LIMIT, parsePositiveInt(searchParams.get('limit'), DEFAULT_LIMIT));
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('paymentStatus');
    const search = searchParams.get('search')?.trim();

    const where: Prisma.OrderWhereInput = {};
    if (status && ORDER_STATUSES.has(status)) where.status = status as OrderStatus;
    if (paymentStatus && PAYMENT_STATUSES.has(paymentStatus)) {
      where.paymentStatus = paymentStatus as PaymentStatus;
    }
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { user: { is: { email: { contains: search, mode: 'insensitive' } } } },
        { user: { is: { name: { contains: search, mode: 'insensitive' } } } },
        { shippingAddress: { is: { phone: { contains: search } } } },
        { shippingAddress: { is: { pincode: { contains: search } } } },
      ];
    }

    const [orders, totalCount, statusGroups] = await Promise.all([
      prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          paymentMethod: true,
          total: true,
          trackingNumber: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { name: true, email: true } },
          items: {
            select: {
              id: true,
              quantity: true,
              price: true,
              product: {
                select: {
                  name: true,
                  images: {
                    select: { url: true, isPrimary: true },
                    orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }],
                    take: 1,
                  },
                },
              },
            },
          },
          // Where the parcel goes. Selected explicitly so the list never
          // carries more of the address book than the row needs.
          shippingAddress: {
            select: {
              name: true,
              phone: true,
              addressLine1: true,
              addressLine2: true,
              city: true,
              district: true,
              state: true,
              pincode: true,
              country: true,
            },
          },
        },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
      prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    const statusCounts: Record<string, number> = {};
    let totalOrders = 0;
    for (const group of statusGroups) {
      statusCounts[group.status] = group._count._all;
      totalOrders += group._count._all;
    }

    return NextResponse.json({
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / limitNum)),
      },
      statusCounts,
      totalOrders,
    });
  } catch (error) {
    return apiError(error);
  }
}
