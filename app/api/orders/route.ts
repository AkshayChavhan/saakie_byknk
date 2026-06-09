import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, verifyAddressOwnership } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';
import { normalizePaymentMethod, isMethodAllowed } from '@/lib/payment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;

    const orders = await prisma.order.findMany({
      where: { userId: r.id },
      include: {
        items: {
          include: {
            product: {
              select: { name: true, slug: true, images: { take: 1 } },
            },
          },
        },
        shippingAddress: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(orders);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;

    const { shippingAddressId, billingAddressId, paymentMethod } = await request.json();

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

    // Enforce the payment modes the admin defined per product: every product in
    // the cart must accept the chosen method, otherwise reject the order.
    const chosenMethod = normalizePaymentMethod(paymentMethod);
    const disallowed = cart.items.find(
      (item) => !isMethodAllowed(chosenMethod, item.product.paymentModes)
    );
    if (disallowed) {
      return NextResponse.json(
        {
          error: `"${disallowed.product.name}" is not available for ${
            chosenMethod === 'COD' ? 'Cash on Delivery' : 'this payment method'
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
        paymentMethod: chosenMethod,
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.price,
            total: item.product.price * item.quantity,
          })),
        },
      },
      include: {
        items: { include: { product: true } },
        shippingAddress: true,
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
