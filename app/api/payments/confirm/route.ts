import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Confirm a Razorpay payment from the client immediately after the checkout
 * modal succeeds (optimistic UI update). The Razorpay WEBHOOK remains the
 * authoritative source of truth (it verifies its own signature, decrements
 * stock and clears the cart) — this endpoint only flips the order to PAID for
 * a snappy UX, AFTER verifying the checkout signature so a forged client call
 * can't mark an unpaid order as paid.
 *
 * Razorpay's client checkout signature is:
 *   HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id, KEY_SECRET)
 */
export async function POST(request: Request) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const orderId = typeof body.orderId === 'string' ? body.orderId : '';
    const razorpayOrderId =
      typeof body.razorpay_order_id === 'string' ? body.razorpay_order_id : '';
    const razorpayPaymentId =
      typeof body.razorpay_payment_id === 'string' ? body.razorpay_payment_id : '';
    const razorpaySignature =
      typeof body.razorpay_signature === 'string' ? body.razorpay_signature : '';

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: r.id },
    });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify the Razorpay checkout signature before trusting the client.
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return NextResponse.json({ error: 'Payments not configured' }, { status: 500 });
    }
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json(
        { error: 'Missing Razorpay verification fields' },
        { status: 400 }
      );
    }

    const expected = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    // Constant-time compare to avoid timing leaks (lengths must match first).
    const sigBuf = Buffer.from(razorpaySignature);
    const expBuf = Buffer.from(expected);
    const valid =
      sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
    if (!valid) {
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
    }

    // Idempotent: re-marking an already-PAID order is harmless. Stock decrement
    // and cart clearing are owned by the webhook to avoid double-counting.
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        paymentId: razorpayPaymentId,
        // Same reasoning as the webhook: a paid order must never stay hidden
        // from the customer who paid for it.
        customerHiddenAt: null,
      },
    });

    return NextResponse.json({ success: true, message: 'Payment confirmed' });
  } catch (error) {
    return apiError(error);
  }
}
