import 'server-only';
import prisma from '@/lib/prisma';
import { invalidate, TAG } from '@/lib/server/cache';

/**
 * Order settlement — the one place a payment outcome is applied to an order.
 *
 * Both the client-side confirm route and the gateway webhooks land here, and
 * each may fire more than once (Razorpay and Stripe redeliver on any non-2xx,
 * the customer can refresh the confirmation page, a capture can arrive after
 * a failed first attempt). Every function is therefore a conditional write:
 *
 *   - `settlePaidOrder` claims the order with a single `updateMany` guarded on
 *     "not already PAID". Whoever wins the claim does the side effects (cart
 *     clear, stock decrement) inside the same transaction; every later caller
 *     sees `applied: false` and does nothing. Stock can never be decremented
 *     twice for one order.
 *   - `settleFailedPayment` only moves PENDING orders. A `payment.failed` that
 *     arrives after the retry succeeded cannot downgrade a paid order.
 *   - `settleRefund` only moves PAID orders, and a partial refund is recorded
 *     in the notes rather than marking the whole order refunded.
 *
 * Unknown ids are reported, not thrown, so a webhook can answer 200 and the
 * gateway stops retrying an event that will never match anything.
 */

export interface SettleResult {
  /** True when this call changed the order; false when it was already settled or unknown. */
  applied: boolean;
  orderNumber: string | null;
  /** Products whose stock could not cover the order. Flagged on the order notes. */
  oversold: string[];
}

const NOT_APPLIED: SettleResult = { applied: false, orderNumber: null, oversold: [] };

/**
 * Resolve the store order a gateway event refers to. Prefers the gateway's own
 * order id (stamped at create-intent) and falls back to the store id carried
 * in notes/metadata for orders created before the column existed.
 */
export async function findOrderForGateway(ref: {
  gatewayOrderId?: string | null;
  orderId?: string | null;
}): Promise<{ id: string } | null> {
  if (ref.gatewayOrderId) {
    const byGateway = await prisma.order.findFirst({
      where: { gatewayOrderId: ref.gatewayOrderId },
      select: { id: true },
    });
    if (byGateway) return byGateway;
  }
  if (ref.orderId) {
    return prisma.order.findUnique({ where: { id: ref.orderId }, select: { id: true } });
  }
  return null;
}

/**
 * Mark an order PAID and apply the side effects exactly once.
 *
 * An order is claimable while its payment is PENDING, FAILED or CANCELLED —
 * a declined first attempt followed by a successful retry is the normal
 * Razorpay flow, and the money is real either way. PAID and REFUNDED orders
 * are never touched.
 */
export async function settlePaidOrder(opts: {
  orderId: string;
  paymentId: string;
}): Promise<SettleResult> {
  const { orderId, paymentId } = opts;

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id: orderId, paymentStatus: { in: ['PENDING', 'FAILED', 'CANCELLED'] } },
      data: {
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        paymentId,
        // A capture can land after the customer cleared the order away. Money
        // changed hands, so put it back on their list.
        customerHiddenAt: null,
      },
    });
    if (claimed.count === 0) return NOT_APPLIED;

    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        orderNumber: true,
        userId: true,
        notes: true,
        items: { select: { productId: true, quantity: true } },
      },
    });
    if (!order) return NOT_APPLIED;

    // Only the lines that were bought leave the cart; anything the customer
    // added while the payment modal was open stays.
    if (order.userId && order.items.length > 0) {
      await tx.cartItem.deleteMany({
        where: {
          cart: { userId: order.userId },
          productId: { in: order.items.map((i) => i.productId) },
        },
      });
    }

    const oversold: string[] = [];
    for (const item of order.items) {
      // `salesCount` feeds the "popular" sort and the bestseller badge; it is
      // maintained here so listings never have to count order items.
      const dec = await tx.product.updateMany({
        where: { id: item.productId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity }, salesCount: { increment: item.quantity } },
      });
      if (dec.count === 0) {
        // Two customers paid for the last unit. Floor the stock at zero and
        // flag the order so admin can resolve it, instead of going negative.
        await tx.product.updateMany({
          where: { id: item.productId },
          data: { stock: 0, salesCount: { increment: item.quantity } },
        });
        oversold.push(item.productId);
      }
    }

    if (oversold.length > 0) {
      const flag = `OVERSOLD: stock was short for product(s) ${oversold.join(', ')}`;
      await tx.order.update({
        where: { id: orderId },
        data: { notes: order.notes ? `${order.notes}\n${flag}` : flag },
      });
    }

    return { applied: true, orderNumber: order.orderNumber, oversold };
  }).then((result) => {
    // Stock and sales changed, and the featured/category caches carry both.
    if (result.applied) invalidate(TAG.products);
    return result;
  });
}

/** Record a failed attempt. Only a still-PENDING order is affected. */
export async function settleFailedPayment(orderId: string): Promise<SettleResult> {
  const res = await prisma.order.updateMany({
    where: { id: orderId, paymentStatus: 'PENDING' },
    data: { status: 'CANCELLED', paymentStatus: 'FAILED' },
  });
  return { applied: res.count > 0, orderNumber: null, oversold: [] };
}

/**
 * Record a refund against the payment it was issued for. `amountMinor` is the
 * refunded amount in the smallest currency unit (paise); when it covers the
 * order total the order becomes REFUNDED, otherwise the partial refund is
 * noted and the order keeps its status.
 */
export async function settleRefund(opts: {
  paymentId: string;
  amountMinor?: number | null;
}): Promise<SettleResult> {
  const order = await prisma.order.findFirst({
    where: { paymentId: opts.paymentId, paymentStatus: 'PAID' },
    select: { id: true, orderNumber: true, total: true, notes: true },
  });
  if (!order) return NOT_APPLIED;

  const totalMinor = Math.round(order.total * 100);
  const partial =
    typeof opts.amountMinor === 'number' && opts.amountMinor > 0 && opts.amountMinor < totalMinor;

  if (partial) {
    const flag = `PARTIAL REFUND: ${(opts.amountMinor! / 100).toFixed(2)} of ${order.total.toFixed(2)}`;
    await prisma.order.update({
      where: { id: order.id },
      data: { notes: order.notes ? `${order.notes}\n${flag}` : flag },
    });
    return { applied: true, orderNumber: order.orderNumber, oversold: [] };
  }

  const res = await prisma.order.updateMany({
    where: { id: order.id, paymentStatus: 'PAID' },
    data: { status: 'REFUNDED', paymentStatus: 'REFUNDED' },
  });
  return { applied: res.count > 0, orderNumber: order.orderNumber, oversold: [] };
}
