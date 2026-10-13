import { NextResponse } from 'next/server';
import { OrderStatus, PaymentStatus, type Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth, requireAdmin } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ORDER_STATUSES = new Set<string>(Object.values(OrderStatus));
const PAYMENT_STATUSES = new Set<string>(Object.values(PaymentStatus));

const TRACKING_MAX = 120;
const NOTES_MAX = 2000;

/**
 * Everything the admin order page shows: customer, items with one image each,
 * and both addresses. GET and PATCH return the same shape so the page can
 * replace its state with whatever the server answers after a save.
 *
 * The customer is a narrow `select`, never `user: true` — the user row carries
 * fields (password hash, Clerk id) that have no business in an order payload.
 */
const orderDetailInclude = {
  user: {
    select: { id: true, name: true, email: true, phone: true, imageUrl: true },
  },
  items: {
    include: {
      product: {
        select: {
          name: true,
          slug: true,
          images: {
            select: { url: true, alt: true },
            orderBy: [{ isPrimary: 'desc' as const }, { order: 'asc' as const }],
            take: 1,
          },
        },
      },
    },
  },
  shippingAddress: true,
  billingAddress: true,
} satisfies Prisma.OrderInclude;

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

    const order = await prisma.order.findUnique({
      where: { id },
      include: orderDetailInclude,
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    return apiError(error);
  }
}

/**
 * PATCH /api/admin/orders/[id] — update fulfilment fields.
 *
 * Accepts any of `status`, `paymentStatus`, `trackingNumber`, `notes`. The two
 * text fields may be sent as an empty string to clear them, which is why they
 * are tested against `undefined` rather than truthiness.
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

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { status, paymentStatus, trackingNumber, notes } = body as Record<string, unknown>;

    const updateData: Prisma.OrderUpdateInput = {};

    if (status !== undefined) {
      if (typeof status !== 'string' || !ORDER_STATUSES.has(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updateData.status = status as OrderStatus;
      if (status === 'DELIVERED') updateData.deliveredAt = new Date();
    }

    if (paymentStatus !== undefined) {
      if (typeof paymentStatus !== 'string' || !PAYMENT_STATUSES.has(paymentStatus)) {
        return NextResponse.json({ error: 'Invalid payment status' }, { status: 400 });
      }
      updateData.paymentStatus = paymentStatus as PaymentStatus;
    }

    if (trackingNumber !== undefined) {
      if (typeof trackingNumber !== 'string' || trackingNumber.length > TRACKING_MAX) {
        return NextResponse.json({ error: 'Invalid tracking number' }, { status: 400 });
      }
      updateData.trackingNumber = trackingNumber.trim() || null;
    }

    if (notes !== undefined) {
      if (typeof notes !== 'string' || notes.length > NOTES_MAX) {
        return NextResponse.json({ error: 'Notes are too long' }, { status: 400 });
      }
      updateData.notes = notes.trim() || null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const existing = await prisma.order.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: orderDetailInclude,
    });

    return NextResponse.json(order);
  } catch (error) {
    return apiError(error);
  }
}
