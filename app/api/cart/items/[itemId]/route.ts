import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const cartInclude = {
  items: {
    include: {
      product: { include: { images: true, colors: true, sizes: true } },
    },
  },
} as const;

export async function PATCH(
  request: Request,
  context: { params: Promise<{ itemId: string }> }
) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const { itemId } = await context.params;
    const { quantity } = await request.json();

    if (quantity < 1) {
      return NextResponse.json({ error: 'Quantity must be at least 1' }, { status: 400 });
    }

    const cartItem = await prisma.cartItem.findFirst({
      where: { id: itemId, cart: { userId: r.id } },
      include: { product: true },
    });

    if (!cartItem) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 });
    }

    if (cartItem.product.stock < quantity) {
      return NextResponse.json(
        { error: `Only ${cartItem.product.stock} items available in stock` },
        { status: 400 }
      );
    }

    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    const updatedCart = await prisma.cart.findUnique({
      where: { userId: r.id },
      include: cartInclude,
    });

    const subtotal = updatedCart!.items.reduce((t, i) => t + i.price * i.quantity, 0);
    const itemCount = updatedCart!.items.reduce((c, i) => c + i.quantity, 0);

    return NextResponse.json({ ...updatedCart, subtotal, itemCount });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ itemId: string }> }
) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const { itemId } = await context.params;

    const cartItem = await prisma.cartItem.findFirst({
      where: { id: itemId, cart: { userId: r.id } },
    });

    if (!cartItem) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 });
    }

    await prisma.cartItem.delete({ where: { id: itemId } });

    return NextResponse.json({ message: 'Item removed from cart' });
  } catch (error) {
    return apiError(error);
  }
}
