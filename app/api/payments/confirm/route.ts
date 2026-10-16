import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';
import { settlePaidOrder } from '@/lib/server/payments';
import { checkRateLimit, clientIp } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Confirm a Razorpay payment from the client immediately after the checkout
 * modal succeeds, so the confirmation page can render without waiting for the
 * webhook. The Razorpay checkout signature is verified first, so a forged
 * client call can't mark an unpaid order as paid:
 *
 *   HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id, KEY_SECRET)
 *
 * The signature proves that Razorpay saw that payment for that Razorpay order.
 * It says nothing about *which store order* the client names, so the Razorpay
 * order id must also match the one stamped on the store order at
 * create-intent — otherwise a signature from a cheap order could be replayed
 * to mark an expensive one as paid.
 *
 * Settlement (stock, cart) goes through `settlePaidOrder`, the same path the
 * webhook uses; whichever of the two arrives first does the work and the other
 * is a no-op.
 */
export async function POST(request: Request) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;

    // A signature is checked per call; cap how fast one client can probe.
    const limit = await checkRateLimit(`pay-confirm:${r.id}:${clientIp(request)}`, 20, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please wait a moment.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
      );
    }

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
      select: { id: true, gatewayOrderId: true, paymentStatus: true },
    });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

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

    // The Razorpay order the signature covers must be the one this store
    // order was created for.
    if (!order.gatewayOrderId || order.gatewayOrderId !== razorpayOrderId) {
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
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

    const result = await settlePaidOrder({ orderId: order.id, paymentId: razorpayPaymentId });
    if (result.oversold.length > 0) {
      console.error(
        `[payments] order ${result.orderNumber} oversold product(s): ${result.oversold.join(', ')}`
      );
    }

    return NextResponse.json({
      success: true,
      message: result.applied ? 'Payment confirmed' : 'Payment already confirmed',
    });
  } catch (error) {
    return apiError(error);
  }
}
