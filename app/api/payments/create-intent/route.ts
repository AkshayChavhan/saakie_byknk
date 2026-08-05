import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { razorpay } from '@/lib/razorpay';
import { requireAuth, verifyAddressOwnership } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';
import {
  normalizePaymentMethod,
  isMethodAllowed,
  storedPaymentMethod,
  storeBlockReason,
} from '@/lib/payment';
import { getStoreSettings } from '@/lib/server/settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPPORTED_GATEWAYS = ['cod', 'razorpay', 'stripe'];

/**
 * Reject a gateway we cannot actually charge, before any order row exists.
 * Without this, anything that wasn't a configured 'stripe'/'razorpay' fell
 * through to the COD-shaped success response — so `paymentGateway: 'anything'`
 * (or 'razorpay' with the keys unset) produced an unpaid PENDING order labelled
 * PREPAID, side-stepping the store-wide COD switch entirely.
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

    const chosenMethod = normalizePaymentMethod(gateway);

    // Store-wide switches first — an admin turning COD off must hold even if
    // every product in the cart still lists COD in its own paymentModes.
    const blocked = storeBlockReason(chosenMethod, await getStoreSettings());
    if (blocked) {
      return NextResponse.json({ error: blocked }, { status: 409 });
    }

    // Then per-product payment modes: a COD-only product cannot be paid via a
    // prepaid gateway, and vice-versa.
    const disallowed = cart.items.find(
      (item) => !isMethodAllowed(chosenMethod, item.product.paymentModes)
    );
    if (disallowed) {
      return NextResponse.json(
        {
          error: `"${disallowed.product.name}" does not accept ${
            chosenMethod === 'COD' ? 'Cash on Delivery' : 'prepaid (online) payment'
          }. Please choose a different payment method.`,
        },
        { status: 409 }
      );
    }

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
        // Records the concrete instrument ("UPI", "CARD", …) for the admin view;
        // normalizePaymentMethod() still reads every value back as COD/PREPAID.
        paymentMethod: storedPaymentMethod(chosenMethod, paymentChannel),
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

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
      },
      gateway: 'cod',
    });
  } catch (error) {
    return apiError(error);
  }
}
