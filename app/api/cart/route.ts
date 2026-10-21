import { NextResponse } from 'next/server';
import { isPrebookable } from '@/lib/prebook';
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
    // A sold-out saree goes in as a pre-booking (lib/prebook.ts) and is not
    // held to the stock count; anything still in stock is.
    const prebook = isPrebookable(product);
    if (!prebook && product.stock < quantity) {
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
    // A pre-booked saree already in the cart: another tap (Pre-book pressed
    // twice, or from the wishlist) must not add a second piece. The cart page
    // can still change the quantity on purpose.
    if (prebook && existingItem) {
      return NextResponse.json(
        { error: 'Product already in cart', code: 'ALREADY_IN_CART' },
        { status: 409 }
      );
    }
    const newQuantity = (existingItem?.quantity ?? 0) + quantity;
    if (!prebook && product.stock < newQuantity) {
      // The cart already holds every piece there is (with one-off sarees,
      // the saree is simply in the cart already). Say so plainly rather than
      // reporting a stock error for a second tap on Add to Cart.
      if (existingItem && existingItem.quantity >= product.stock) {
        return NextResponse.json(
          { error: 'Product already in cart', code: 'ALREADY_IN_CART' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: `Only ${product.stock} items available in stock` },
        { status: 400 }
      );
    }

    // One line per product per cart (unique on cartId+productId). An upsert
    // makes two simultaneous adds merge into that line instead of racing the
    // read above and creating a duplicate. For a pre-booking the racing add
    // leaves the quantity alone, so two taps at once still mean one piece.
    await prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      create: { cartId: cart.id, productId, quantity, price: product.price },
      update: prebook
        ? { price: product.price }
        : { quantity: { increment: quantity }, price: product.price },
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
