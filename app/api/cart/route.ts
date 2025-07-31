import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma as db } from '@/lib/db';

// GET /api/cart - Get user's cart
export async function GET() {
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

    // Get or create cart for user
    let cart = await db.cart.findUnique({
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

    if (!cart) {
      cart = await db.cart.create({
        data: { userId: user.id },
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
    }

    // Calculate cart totals
    const subtotal = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    const itemCount = cart.items.reduce((count, item) => count + item.quantity, 0);

    return NextResponse.json({
      ...cart,
      subtotal,
      itemCount
    });

  } catch (error) {
    console.error('Error fetching cart:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/cart - Add item to cart
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productId, quantity = 1 } = await request.json();

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    if (quantity < 1) {
      return NextResponse.json({ error: 'Quantity must be at least 1' }, { status: 400 });
    }

    // Find user by clerkId
    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if product exists and get current price
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { id: true, price: true, stock: true, isActive: true }
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (!product.isActive) {
      return NextResponse.json({ error: 'Product is not available' }, { status: 400 });
    }

    if (product.stock < quantity) {
      return NextResponse.json({ 
        error: `Only ${product.stock} items available in stock` 
      }, { status: 400 });
    }

    // Get or create cart
    let cart = await db.cart.findUnique({
      where: { userId: user.id },
      include: { items: true }
    });

    if (!cart) {
      cart = await db.cart.create({
        data: { userId: user.id },
        include: { items: true }
      });
    }

    // Check if item already exists in cart
    const existingItem = cart.items.find(item => item.productId === productId);

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      
      if (product.stock < newQuantity) {
        return NextResponse.json({ 
          error: `Only ${product.stock} items available in stock` 
        }, { status: 400 });
      }

      // Update existing item
      await db.cartItem.update({
        where: { id: existingItem.id },
        data: { 
          quantity: newQuantity,
          price: product.price // Update to current price
        }
      });
    } else {
      // Add new item to cart
      await db.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
          price: product.price
        }
      });
    }

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

    const subtotal = updatedCart!.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    const itemCount = updatedCart!.items.reduce((count, item) => count + item.quantity, 0);

    return NextResponse.json({
      ...updatedCart,
      subtotal,
      itemCount
    });

  } catch (error) {
    console.error('Error adding item to cart:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/cart - Clear entire cart
export async function DELETE() {
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

    // Clear all items from cart
    await db.cartItem.deleteMany({
      where: {
        cart: {
          userId: user.id
        }
      }
    });

    return NextResponse.json({ message: 'Cart cleared successfully' });

  } catch (error) {
    console.error('Error clearing cart:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}