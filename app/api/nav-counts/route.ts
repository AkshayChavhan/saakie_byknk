import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const revalidate = 60;

/**
 * Existence counts for the site chrome: how many products are genuinely on
 * sale, and how many blog posts are published. The header and footer use
 * these to hide the "Sale" tab and "Blog" links when there is nothing behind
 * them — the same reasoning as the Categories dropdown, which is left out
 * when the tree is empty. One endpoint rather than two so the chrome costs a
 * single request (React Query dedupes the header's and footer's fetches).
 *
 * "On sale" matches the `?sale=true` listing filter exactly: an active
 * product whose comparePrice sits strictly above its price.
 */
export async function GET() {
  try {
    const [sale, blog] = await Promise.all([
      prisma.product.count({
        where: {
          isActive: true,
          comparePrice: { gt: prisma.product.fields.price },
        },
      }),
      prisma.blogPost.count({ where: { isPublished: true } }),
    ]);

    return NextResponse.json({ sale, blog });
  } catch (error) {
    return apiError(error);
  }
}
