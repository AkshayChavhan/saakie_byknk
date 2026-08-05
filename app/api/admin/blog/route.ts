import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { uploadImage } from '@/lib/cloudinary';
import { validateImageFile } from '@/lib/upload';
import { requireAuth, requireAdmin } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';
import { estimateReadMinutes } from '@/lib/markdown';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Every post including drafts — the admin list is the only place they show up. */
export async function GET() {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const admin = requireAdmin(r);
    if (admin) return admin;

    const posts = await prisma.blogPost.findMany({
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(posts);
  } catch (error) {
    return apiError(error);
  }
}

/**
 * Create a blog post.
 * multipart/form-data: a JSON `data` field plus an optional `image` file
 * (BlogPost.image is nullable — a post can run without a cover).
 */
export async function POST(request: Request) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const admin = requireAdmin(r);
    if (admin) return admin;

    const formData = await request.formData();
    const dataJson = formData.get('data');
    const data = typeof dataJson === 'string' ? JSON.parse(dataJson) : {};
    const imageFile = formData.get('image');

    const {
      title,
      slug,
      excerpt,
      content,
      category,
      authorName,
      isPublished = false,
      isFeatured = false,
    } = data;

    if (!title || !slug || !excerpt || !content || !category) {
      return NextResponse.json(
        { error: 'Title, slug, excerpt, content and category are required' },
        { status: 400 }
      );
    }

    const duplicate = await prisma.blogPost.findUnique({ where: { slug } });
    if (duplicate) {
      return NextResponse.json(
        { error: 'A post with this slug already exists' },
        { status: 400 }
      );
    }

    // Reject a bad file before spending a Cloudinary upload or writing the row.
    let imageUrl: string | null = null;
    let imagePublicId: string | null = null;
    if (imageFile instanceof File) {
      const v = validateImageFile(imageFile);
      if (!v.valid) {
        return NextResponse.json({ error: v.error }, { status: 400 });
      }
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const result = await uploadImage(buffer, 'blog');
      imageUrl = result.url;
      imagePublicId = result.publicId;
    }

    const published = isPublished === true || isPublished === 'true';
    const featured = isFeatured === true || isFeatured === 'true';

    const post = await prisma.blogPost.create({
      data: {
        title,
        slug,
        excerpt,
        content,
        category,
        image: imageUrl,
        imagePublicId,
        authorName: authorName || null,
        // Never taken from the client — reading time has to match the body that
        // was actually stored.
        readMinutes: estimateReadMinutes(content),
        isPublished: published,
        isFeatured: featured,
        publishedAt: published ? new Date() : null,
      },
    });

    // The storefront hero shows a single featured post, so promoting one demotes
    // the rest. Runs after the create so the new post is excluded by its own id.
    if (featured) {
      await prisma.blogPost.updateMany({
        where: { isFeatured: true, NOT: { id: post.id } },
        data: { isFeatured: false },
      });
    }

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
