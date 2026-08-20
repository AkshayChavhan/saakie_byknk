import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { razorpay } from '@/lib/razorpay';
import { requireAuth, verifyAddressOwnership } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';
import { storedPaymentMethod } from '@/lib/payment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPPORTED_GATEWAYS = ['razorpay', 'stripe'];

/**
 * Reject a gateway we cannot actually charge, before any order row exists.
 * Without this, anything that wasn't a configured 'stripe'/'razorpay' would
 * produce an unpaid PENDING order that no gateway ever settles.
 */
function gatewayError(gateway: string): NextResponse | null {
  if (!SUPPORTED_GATEWAYS.includes(gateway)) {
    return NextResponse.json({ error: 'Unsupported payment method' }, { status: 400 });
  }
  if ((gateway === 'razorpay' && !razorpay) || (gateway === 'stripe' && !stripe)) {
    return NextResponse.json(
      { error: 'Online payment is unavailable right now. Please try again later.' },
      { status: 503 }
    );
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;

    const { paymentGateway, paymentChannel, shippingAddressId, billingAddressId } =
      await request.json();

    if (!shippingAddressId) {
      return NextResponse.json({ error: 'Shipping address is required' }, { status: 400 });
    }

    // Ensure the chosen addresses belong to this user — otherwise an attacker
    // could attach (and later read back) another user's address by id.
    const badAddress = await verifyAddressOwnership(r.id, [shippingAddressId, billingAddressId]);
    if (badAddress) return badAddress;

    const cart = await prisma.cart.findUnique({
      where: { userId: r.id },
      include: { items: { include: { product: true } } },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${item.product.name}` },
          { status: 400 }
        );
      }
    }

    // Reject unknown/unconfigured gateways BEFORE writing an order.
    const gateway = String(paymentGateway ?? '').trim().toLowerCase();
    const gatewayIssue = gatewayError(gateway);
    if (gatewayIssue) return gatewayIssue;

    const subtotal = cart.items.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0
    );
    const tax = 0;
    const shipping = subtotal > 999 ? 0 : 99;
    const total = subtotal + tax + shipping;

    const orderNumber = `ORD-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)
      .toUpperCase()}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: r.id,
        subtotal,
        tax,
        shipping,
        total,
        shippingAddressId,
        billingAddressId: billingAddressId || shippingAddressId,
        // Records the concrete instrument ("UPI", "CARD", …) for the admin view.
        paymentMethod: storedPaymentMethod(paymentChannel),
        status: 'PENDING',
        paymentStatus: 'PENDING',
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.price,
            total: item.product.price * item.quantity,
          })),
        },
      },
    });

    if (gateway === 'stripe' && stripe) {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(total * 100),
        currency: 'inr',
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
        },
      });

      return NextResponse.json({
        success: true,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          total: order.total,
        },
        clientSecret: paymentIntent.client_secret,
        gateway: 'stripe',
      });
    }

    if (gateway === 'razorpay' && razorpay) {
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(total * 100),
        currency: 'INR',
        receipt: order.orderNumber,
        notes: { orderId: order.id },
      });

      return NextResponse.json({
        success: true,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          total: order.total,
        },
        razorpayOrderId: razorpayOrder.id,
        gateway: 'razorpay',
      });
    }

    // Unreachable: gatewayError() already guaranteed a configured gateway.
    return NextResponse.json(
      { error: 'Online payment is unavailable right now. Please try again later.' },
      { status: 503 }
    );
  } catch (error) {
    return apiError(error);
  }
}
