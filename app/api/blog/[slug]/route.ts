import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const revalidate = 60;

/**
 * Card-shaped projection for the "related reads" strip — same shape the /blog
 * index consumes, minus `content`, which no card renders.
 */
const cardSelect = {
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
} as const;

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;

    const post = await prisma.blogPost.findFirst({
      where: { slug, isPublished: true },
    });

    // A draft answers exactly like a missing post: matching on `isPublished` in
    // the query rather than fetching and then checking means an unpublished
    // slug can't be probed for existence through a different status or timing.
    if (!post) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });
    }

    const related = await prisma.blogPost.findMany({
      where: { isPublished: true, id: { not: post.id } },
      select: cardSelect,
      take: 3,
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ post, related });
  } catch (error) {
    return apiError(error);
  }
}
