import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
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
 * Stripe payment events. Stripe redelivers any event that does not get a 2xx,
 * so every branch is idempotent (see lib/server/payments.ts) and an event for
 * an order we do not have is acknowledged rather than errored.
 */
export async function POST(request: Request) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    const sig = request.headers.get('stripe-signature');
    if (!sig) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    const rawBody = await request.text();

    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
      console.error('Stripe webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log(`Stripe webhook received: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const order = await findOrderForGateway({
          gatewayOrderId: paymentIntent.id,
          orderId: paymentIntent.metadata?.orderId,
        });
        if (!order) {
          console.warn(`Stripe payment intent ${paymentIntent.id} matched no order`);
          break;
        }

        const result = await settlePaidOrder({ orderId: order.id, paymentId: paymentIntent.id });
        if (result.applied) {
          console.log(`Order ${result.orderNumber} payment succeeded`);
          if (result.oversold.length > 0) {
            console.error(
              `[payments] order ${result.orderNumber} oversold product(s): ${result.oversold.join(', ')}`
            );
          }
        } else {
          console.log(`Order ${order.id} already settled; event ignored`);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const order = await findOrderForGateway({
          gatewayOrderId: paymentIntent.id,
          orderId: paymentIntent.metadata?.orderId,
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

      case 'charge.refunded': {
        const charge = event.data.object;
        const paymentIntentId =
          typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : charge.payment_intent?.id;
        if (!paymentIntentId) break;
        const result = await settleRefund({
          paymentId: paymentIntentId,
          amountMinor: typeof charge.amount_refunded === 'number' ? charge.amount_refunded : null,
        });
        if (result.applied) console.log(`Order ${result.orderNumber} refund recorded`);
        break;
      }

      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
