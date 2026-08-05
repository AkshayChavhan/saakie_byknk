import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const revalidate = 60;

/**
 * Published posts for the /blog index.
 *
 * `content` is deliberately left out of the select: post bodies are full
 * Markdown documents and the index only renders cards (title, excerpt, image,
 * meta), so shipping them would balloon the payload for nothing. The single
 * post route is the only place that reads `content`.
 *
 * Drafts never appear here — `isPublished` is the storefront's only gate.
 */
export async function GET() {
  try {
    const posts = await prisma.blogPost.findMany({
      where: { isPublished: true },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        category: true,
        image: true,
        authorName: true,
        readMinutes: true,
        isFeatured: true,
        publishedAt: true,
      },
      // `publishedAt` is null on posts published before the field was stamped,
      // so `createdAt` is the tiebreaker that keeps ordering stable.
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(posts);
  } catch (error) {
    return apiError(error);
  }
}
