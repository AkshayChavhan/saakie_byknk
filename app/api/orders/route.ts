import { NextResponse } from 'next/server';
import { isPrebookable } from '@/lib/prebook';
import prisma from '@/lib/prisma';
import { requireAuth, verifyAddressOwnership } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';
import { markLines } from '@/lib/server/watermark';
import { getStoreSettings } from '@/lib/server/settings';
import { calculateShipping } from '@/lib/shipping';
import { IMAGE_ORDER } from '@/lib/server/image-order';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;

    const orders = await prisma.order.findMany({
      where: {
        userId: r.id,
        // Only orders that were paid for. Checkout saves the order before the
        // payment window opens, so an abandoned or failed payment would
        // otherwise show up here; admin still sees those. REFUNDED stays so
        // the customer can see their refund.
        paymentStatus: { in: ['PAID', 'REFUNDED'] },
        // Orders the customer has cleared away are hidden from them but still
        // exist for admin and reporting — see DELETE /api/orders/[id]. On
        // MongoDB `null` only matches a field saved as null, not one that was
        // never written, so both are checked.
        OR: [{ customerHiddenAt: null }, { customerHiddenAt: { isSet: false } }],
      },
      include: {
        items: {
          include: {
            product: {
              select: { name: true, slug: true, images: { take: 1, orderBy: IMAGE_ORDER } },
            },
          },
        },
        shippingAddress: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(orders.map((order) => markLines(order)));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;

    const { shippingAddressId, billingAddressId } = await request.json();

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

    const subtotal = cart.items.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0
    );
    const tax = 0;
    // Shipping is an admin switch (/admin/settings): off ⇒ free for everyone.
    const settings = await getStoreSettings();
    const itemCount = cart.items.reduce((n, item) => n + item.quantity, 0);
    const shipping = calculateShipping(subtotal, itemCount, settings);
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
        paymentMethod: 'PREPAID',
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.price,
            total: item.product.price * item.quantity,
            isPrebook: isPrebookable(item.product),
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
