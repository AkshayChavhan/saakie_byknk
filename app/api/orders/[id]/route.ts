import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';
import { getOrderRemoval, ORDER_REMOVAL_STATUS } from '@/lib/orders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const { id } = await context.params;

    const order = await prisma.order.findFirst({
      where: { id, userId: r.id },
      include: {
        items: {
          include: { product: { include: { images: { take: 1 } } } },
        },
        shippingAddress: true,
        billingAddress: true,
      },
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
 * Take an order off the customer's own list.
 *
 * Despite the verb, nothing is deleted: an unpaid order that has not shipped is
 * cancelled, and the row is then stamped `customerHiddenAt` so it drops out of
 * GET /api/orders. Admin, revenue figures and the audit trail are untouched.
 * Hard-deleting instead would rewrite the shop's history and leave a late
 * webhook updating a row that no longer exists.
 *
 * Whether an order qualifies is decided by `getOrderRemoval` in lib/orders.ts —
 * the same function the account page uses to decide whether to offer the button,
 * so the two can never disagree.
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const { id } = await context.params;

    // Scoped by userId, so another customer's order is indistinguishable from
    // one that does not exist.
    const order = await prisma.order.findFirst({
      where: { id, userId: r.id },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        customerHiddenAt: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const removal = getOrderRemoval(order);
    if (!removal.canRemove) {
      return NextResponse.json(
        { error: removal.message, reason: removal.reason },
        { status: ORDER_REMOVAL_STATUS[removal.reason] }
      );
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        // Removing twice is a no-op rather than a fresh timestamp, so a
        // double-tap or a retried request cannot rewrite when it happened.
        customerHiddenAt: order.customerHiddenAt ?? new Date(),
        // A live order is cancelled on the way out. The payment is marked
        // cancelled too — it is never going to be collected now.
        ...(removal.cancelFirst
          ? { status: 'CANCELLED' as const, paymentStatus: 'CANCELLED' as const }
          : {}),
      },
    });

    return NextResponse.json({
      success: true,
      cancelled: removal.cancelFirst,
      reason: removal.reason,
    });
  } catch (error) {
    return apiError(error);
  }
}
