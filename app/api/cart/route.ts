import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';
import { markLines } from '@/lib/server/watermark';
import { cartAddSchema, validateBody } from '@/lib/server/validation';
import { cartInclude, cartTotals as totals } from '@/lib/server/cart';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;

    let cart = await prisma.cart.findUnique({
      where: { userId: r.id },
      include: cartInclude,
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: r.id },
        include: cartInclude,
      });
    }

    return NextResponse.json(markLines({ ...cart, ...totals(cart) }));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;

    const parsed = validateBody(cartAddSchema, await request.json().catch(() => null));
    if (parsed instanceof NextResponse) return parsed;
    const { productId, quantity } = parsed;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, price: true, stock: true, isActive: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    if (!product.isActive) {
      return NextResponse.json({ error: 'Product is not available' }, { status: 400 });
    }
    if (product.stock < quantity) {
      return NextResponse.json(
        { error: `Only ${product.stock} items available in stock` },
        { status: 400 }
      );
    }

    let cart = await prisma.cart.findUnique({
      where: { userId: r.id },
      include: { items: true },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: r.id },
        include: { items: true },
      });
    }

    const existingItem = cart.items.find((i) => i.productId === productId);
    const newQuantity = (existingItem?.quantity ?? 0) + quantity;
    if (product.stock < newQuantity) {
      return NextResponse.json(
        { error: `Only ${product.stock} items available in stock` },
        { status: 400 }
      );
    }

    // One line per product per cart (unique on cartId+productId). An upsert
    // makes two simultaneous adds merge into that line instead of racing the
    // read above and creating a duplicate.
    await prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      create: { cartId: cart.id, productId, quantity, price: product.price },
      update: { quantity: { increment: quantity }, price: product.price },
    });

    const updatedCart = await prisma.cart.findUnique({
      where: { userId: r.id },
      include: cartInclude,
    });

    return NextResponse.json(markLines({ ...updatedCart!, ...totals(updatedCart!) }));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE() {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;

    await prisma.cartItem.deleteMany({
      where: { cart: { userId: r.id } },
    });

    return NextResponse.json({ message: 'Cart cleared successfully' });
  } catch (error) {
    return apiError(error);
  }
}
