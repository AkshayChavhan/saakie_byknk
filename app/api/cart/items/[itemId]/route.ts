import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isPrebookable } from '@/lib/prebook';
import { requireAuth } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';
import { markLines } from '@/lib/server/watermark';
import { cartQuantitySchema, validateBody } from '@/lib/server/validation';
import { cartInclude } from '@/lib/server/cart';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ itemId: string }> }
) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const { itemId } = await context.params;
    const parsed = validateBody(cartQuantitySchema, await request.json().catch(() => null));
    if (parsed instanceof NextResponse) return parsed;
    const { quantity } = parsed;

    const cartItem = await prisma.cartItem.findFirst({
      where: { id: itemId, cart: { userId: r.id } },
      include: { product: true },
    });

    if (!cartItem) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 });
    }

    // Pre-booked (sold-out) lines are not held to the stock count.
    if (!isPrebookable(cartItem.product) && cartItem.product.stock < quantity) {
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

    return NextResponse.json(markLines({ ...updatedCart!, subtotal, itemCount }));
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

    // Return the full updated cart (same shape as PATCH and GET /api/cart) so
    // the client can setCart(...) directly. Previously this returned only a
    // { message } object, which made cart.items undefined and crashed the UI.
    const updatedCart = await prisma.cart.findUnique({
      where: { userId: r.id },
      include: cartInclude,
    });
    const items = updatedCart?.items ?? [];
    const subtotal = items.reduce((t, i) => t + i.price * i.quantity, 0);
    const itemCount = items.reduce((c, i) => c + i.quantity, 0);

    return NextResponse.json(markLines({ ...updatedCart, items, subtotal, itemCount }));
  } catch (error) {
    return apiError(error);
  }
}
