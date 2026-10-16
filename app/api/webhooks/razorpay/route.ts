import { NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  findOrderForGateway,
  settleFailedPayment,
  settlePaidOrder,
  settleRefund,
} from '@/lib/server/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Razorpay payment events. Razorpay redelivers any event that does not get a
 * 2xx, so every branch is idempotent (see lib/server/payments.ts) and an
 * event that refers to an order we do not have is acknowledged, not errored —
 * a 500 there would just make Razorpay retry it until it gives up and
 * disables the webhook.
 */
export async function POST(request: Request) {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('RAZORPAY_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    const signature = request.headers.get('x-razorpay-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const rawBody = await request.text();

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      console.error('Razorpay webhook signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const body = JSON.parse(rawBody);
    const event: string = body.event;
    const payload = body.payload ?? {};

    console.log(`Razorpay webhook received: ${event}`);

    switch (event) {
      case 'payment.captured': {
        const payment = payload.payment?.entity ?? {};
        const order = await findOrderForGateway({
          gatewayOrderId: payment.order_id,
          orderId: payment.notes?.orderId,
        });
        if (!order) {
          console.warn(`Razorpay payment ${payment.id} matched no order`);
          break;
        }

        const result = await settlePaidOrder({ orderId: order.id, paymentId: payment.id });
        if (result.applied) {
          console.log(`Order ${result.orderNumber} payment captured`);
          if (result.oversold.length > 0) {
            console.error(
              `[payments] order ${result.orderNumber} oversold product(s): ${result.oversold.join(', ')}`
            );
          }
        } else {
          console.log(`Order ${order.id} already settled; capture ignored`);
        }
        break;
      }

      case 'payment.failed': {
        const payment = payload.payment?.entity ?? {};
        const order = await findOrderForGateway({
          gatewayOrderId: payment.order_id,
          orderId: payment.notes?.orderId,
        });
        if (order) {
          const result = await settleFailedPayment(order.id);
          console.log(
            result.applied
              ? `Order ${order.id} payment failed`
              : `Order ${order.id} not pending; failure ignored`
          );
        }
        break;
      }

      case 'refund.created': {
        const refund = payload.refund?.entity ?? {};
        const result = await settleRefund({
          paymentId: refund.payment_id,
          amountMinor: typeof refund.amount === 'number' ? refund.amount : null,
        });
        if (result.applied) console.log(`Order ${result.orderNumber} refund recorded`);
        break;
      }

      default:
        console.log(`Unhandled Razorpay event: ${event}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Razorpay webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
