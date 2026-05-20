import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

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

    if (signature !== expectedSignature) {
      console.error('Razorpay webhook signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const body = JSON.parse(rawBody);
    const event = body.event;
    const payload = body.payload;

    console.log(`Razorpay webhook received: ${event}`);

    switch (event) {
      case 'payment.captured': {
        const payment = payload.payment.entity;
        const orderId = payment.notes?.orderId;

        if (orderId) {
          const order = await prisma.order.update({
            where: { id: orderId },
            data: {
              status: 'CONFIRMED',
              paymentStatus: 'PAID',
              paymentId: payment.id,
            },
          });

          if (order.userId) {
            await prisma.cartItem.deleteMany({
              where: { cart: { userId: order.userId } },
            });
          }

          const orderItems = await prisma.orderItem.findMany({
            where: { orderId: order.id },
          });

          for (const item of orderItems) {
            await prisma.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: item.quantity } },
            });
          }

          console.log(`Order ${order.orderNumber} payment captured`);
        }
        break;
      }

      case 'payment.failed': {
        const payment = payload.payment.entity;
        const orderId = payment.notes?.orderId;
        if (orderId) {
          await prisma.order.update({
            where: { id: orderId },
            data: { status: 'CANCELLED', paymentStatus: 'FAILED' },
          });
          console.log(`Order ${orderId} payment failed`);
        }
        break;
      }

      case 'refund.created': {
        const refund = payload.refund.entity;
        const paymentId = refund.payment_id;
        const order = await prisma.order.findFirst({ where: { paymentId } });

        if (order) {
          await prisma.order.update({
            where: { id: order.id },
            data: { status: 'REFUNDED', paymentStatus: 'REFUNDED' },
          });
          console.log(`Order ${order.orderNumber} refunded`);
        }
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
