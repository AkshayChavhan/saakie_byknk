import 'server-only';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * A `select`, not `include`: the wishlist page needs a card's worth of each
 * product, not the whole document (cost price included) and category.
 */
export const wishlistInclude = {
  items: {
    select: {
      id: true,
      wishlistId: true,
      productId: true,
      addedAt: true,
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
          category: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  },
} satisfies Prisma.WishlistInclude;

/** The signed-in user's wishlist items, for the server-rendered wishlist page. */
export async function loadWishlistItems(userId: string) {
  const wishlist = await prisma.wishlist.findUnique({
    where: { userId },
    include: wishlistInclude,
  });
  return wishlist?.items ?? [];
}
