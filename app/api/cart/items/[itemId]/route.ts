import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma as db } from '@/lib/db';

// PATCH /api/cart/items/[itemId] - Update cart item quantity
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quantity } = await request.json();

    if (!quantity || quantity < 1) {
      return NextResponse.json({ error: 'Quantity must be at least 1' }, { status: 400 });
    }

    // Find user by clerkId
    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find cart item and verify ownership
    const { itemId } = await params;
    const cartItem = await db.cartItem.findFirst({
      where: {
        id: itemId,
        cart: {
          userId: user.id
        }
      },
      include: {
        product: {
          select: { stock: true, price: true, isActive: true }
        }
      }
    });

    if (!cartItem) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 });
    }

    if (!cartItem.product.isActive) {
      return NextResponse.json({ error: 'Product is no longer available' }, { status: 400 });
    }

    if (cartItem.product.stock < quantity) {
      return NextResponse.json({ 
        error: `Only ${cartItem.product.stock} items available in stock` 
      }, { status: 400 });
    }

    // Update cart item
    await db.cartItem.update({
      where: { id: itemId },
      data: { 
        quantity,
        price: cartItem.product.price // Update to current price
      }
    });

    // Return updated cart
    const updatedCart = await db.cart.findUnique({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true,
                colors: true,
                sizes: true,
              }
            }
          }
        }
      }
    });

    if (!updatedCart) {
      return NextResponse.json({ error: 'Cart not found' }, { status: 404 });
    }

    const subtotal = updatedCart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    const itemCount = updatedCart.items.reduce((count, item) => count + item.quantity, 0);

    return NextResponse.json({
      ...updatedCart,
      subtotal,
      itemCount
    });

  } catch (error) {
    console.error('Error updating cart item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/cart/items/[itemId] - Remove cart item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find user by clerkId
    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify cart item ownership and delete
    const { itemId } = await params;
    const cartItem = await db.cartItem.findFirst({
      where: {
        id: itemId,
        cart: {
          userId: user.id
        }
      }
    });

    if (!cartItem) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 });
    }

    await db.cartItem.delete({
      where: { id: itemId }
    });

    // Return updated cart
    const updatedCart = await db.cart.findUnique({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true,
                colors: true,
                sizes: true,
              }
            }
          }
        }
      }
    });

    if (!updatedCart) {
      return NextResponse.json({ error: 'Cart not found' }, { status: 404 });
    }

    const subtotal = updatedCart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    const itemCount = updatedCart.items.reduce((count, item) => count + item.quantity, 0);

    return NextResponse.json({
      ...updatedCart,
      subtotal,
      itemCount
    });

  } catch (error) {
    console.error('Error removing cart item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}