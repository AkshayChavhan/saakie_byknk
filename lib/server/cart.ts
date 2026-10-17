import 'server-only';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { markLines } from '@/lib/server/watermark';

/**
 * The cart as the storefront renders it. A `select` rather than `include`:
 * the cart page needs a name, a link, a price, stock and one thumbnail per
 * line, not every image, colour, size and the cost price of each product.
 */
export const cartInclude = {
  items: {
    select: {
      id: true,
      cartId: true,
      productId: true,
      quantity: true,
      price: true,
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          comparePrice: true,
          stock: true,
          isActive: true,
          images: {
            select: { url: true, isPrimary: true },
            orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }],
            take: 1,
          },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

export function cartTotals(cart: { items: { price: number; quantity: number }[] }) {
  const subtotal = cart.items.reduce((t, i) => t + i.price * i.quantity, 0);
  const itemCount = cart.items.reduce((c, i) => c + i.quantity, 0);
  return { subtotal, itemCount };
}

/**
 * Number of units in a user's cart, for the header badge. One aggregate
 * instead of loading every line with its product.
 */
export async function getCartItemCount(userId: string): Promise<number> {
  const agg = await prisma.cartItem.aggregate({
    where: { cart: { userId } },
    _sum: { quantity: true },
  });
  return agg._sum.quantity ?? 0;
}

/**
 * The signed-in user's cart with totals, in the shape `GET /api/cart`
 * returns, for pages that render on the server. Creates the cart row on
 * first use, as the API does.
 */
export async function loadCart(userId: string) {
  const cart =
    (await prisma.cart.findUnique({ where: { userId }, include: cartInclude })) ??
    (await prisma.cart.create({ data: { userId }, include: cartInclude }));
  return markLines({ ...cart, ...cartTotals(cart) });
}
