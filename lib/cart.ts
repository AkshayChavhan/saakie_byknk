import { prisma as db } from '@/lib/db';

export interface CartValidationResult {
  isValid: boolean;
  errors: string[];
  unavailableItems: string[];
  insufficientStockItems: { productId: string; requested: number; available: number }[];
}

export async function validateCart(userId: string): Promise<CartValidationResult> {
  const result: CartValidationResult = {
    isValid: true,
    errors: [],
    unavailableItems: [],
    insufficientStockItems: []
  };

  try {
    // Get user cart
    const cart = await db.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                stock: true,
                isActive: true,
                price: true
              }
            }
          }
        }
      }
    });

    if (!cart || cart.items.length === 0) {
      result.isValid = false;
      result.errors.push('Cart is empty');
      return result;
    }

    // Validate each cart item
    for (const item of cart.items) {
      // Check if product is still active
      if (!item.product.isActive) {
        result.isValid = false;
        result.unavailableItems.push(item.product.name);
        result.errors.push(`${item.product.name} is no longer available`);
      }

      // Check stock availability
      if (item.product.stock < item.quantity) {
        result.isValid = false;
        result.insufficientStockItems.push({
          productId: item.product.id,
          requested: item.quantity,
          available: item.product.stock
        });
        result.errors.push(`Only ${item.product.stock} units of ${item.product.name} available`);
      }

      // Check for price changes (optional validation)
      if (item.price !== item.product.price) {
        // This is not an error, but we could notify the user
        // For now, we'll auto-update prices during checkout
      }
    }

    return result;

  } catch (error) {
    console.error('Error validating cart:', error);
    result.isValid = false;
    result.errors.push('Failed to validate cart');
    return result;
  }
}

export async function updateCartItemPrices(userId: string): Promise<void> {
  try {
    const cart = await db.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, price: true }
            }
          }
        }
      }
    });

    if (!cart) return;

    // Update prices for all cart items
    for (const item of cart.items) {
      if (item.price !== item.product.price) {
        await db.cartItem.update({
          where: { id: item.id },
          data: { price: item.product.price }
        });
      }
    }
  } catch (error) {
    console.error('Error updating cart item prices:', error);
    throw error;
  }
}

export async function calculateCartTotals(userId: string) {
  const cart = await db.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            select: { price: true }
          }
        }
      }
    }
  });

  if (!cart) {
    return {
      subtotal: 0,
      itemCount: 0,
      items: []
    };
  }

  const subtotal = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  const itemCount = cart.items.reduce((count, item) => count + item.quantity, 0);

  return {
    subtotal,
    itemCount,
    items: cart.items
  };
}

export async function clearExpiredCartItems(): Promise<void> {
  try {
    // Remove items for products that are no longer active
    await db.cartItem.deleteMany({
      where: {
        product: {
          isActive: false
        }
      }
    });

    // Remove items that exceed available stock
    const cartItems = await db.cartItem.findMany({
      include: {
        product: {
          select: { stock: true }
        }
      }
    });

    for (const item of cartItems) {
      if (item.quantity > item.product.stock) {
        if (item.product.stock === 0) {
          // Remove item completely if no stock
          await db.cartItem.delete({
            where: { id: item.id }
          });
        } else {
          // Reduce quantity to available stock
          await db.cartItem.update({
            where: { id: item.id },
            data: { quantity: item.product.stock }
          });
        }
      }
    }
  } catch (error) {
    console.error('Error clearing expired cart items:', error);
    throw error;
  }
}

export type CartItem = {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    stock: number;
    isActive: boolean;
    images: Array<{
      url: string;
      alt: string | null;
      isPrimary: boolean;
    }>;
  };
};

export type Cart = {
  id: string;
  userId: string;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
};