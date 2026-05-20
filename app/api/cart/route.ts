import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const cartInclude = {
  items: {
    include: {
      product: {
        include: { images: true, colors: true, sizes: true },
      },
    },
  },
} as const;

function totals(cart: { items: { price: number; quantity: number }[] }) {
  const subtotal = cart.items.reduce((t, i) => t + i.price * i.quantity, 0);
  const itemCount = cart.items.reduce((c, i) => c + i.quantity, 0);
  return { subtotal, itemCount };
}

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

    return NextResponse.json({ ...cart, ...totals(cart) });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;

    const { productId, quantity = 1 } = await request.json();

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }
    if (quantity < 1) {
      return NextResponse.json({ error: 'Quantity must be at least 1' }, { status: 400 });
    }

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

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (product.stock < newQuantity) {
        return NextResponse.json(
          { error: `Only ${product.stock} items available in stock` },
          { status: 400 }
        );
      }
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity, price: product.price },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
          price: product.price,
        },
      });
    }

    const updatedCart = await prisma.cart.findUnique({
      where: { userId: r.id },
      include: cartInclude,
    });

    return NextResponse.json({ ...updatedCart, ...totals(updatedCart!) });
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
