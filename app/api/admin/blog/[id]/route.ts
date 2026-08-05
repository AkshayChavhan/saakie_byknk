import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { uploadImage, deleteFromCloudinary } from '@/lib/cloudinary';
import { validateImageFile } from '@/lib/upload';
import { requireAuth, requireAdmin } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';
import { estimateReadMinutes } from '@/lib/markdown';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** The full row, content included — this is what the admin editor loads. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const admin = requireAdmin(r);
    if (admin) return admin;
    const { id } = await context.params;

    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });
    }

    return NextResponse.json(post);
  } catch (error) {
    return apiError(error);
  }
}

/**
 * Update a blog post.
 * multipart/form-data: a JSON `data` field plus an optional `image` file.
 * When a new image is uploaded, the previous Cloudinary image is removed.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const admin = requireAdmin(r);
    if (admin) return admin;
    const { id } = await context.params;

    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });
    }

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
      isPublished,
      isFeatured,
    } = data;

    // Only a genuine change needs checking; re-saving a post with its own slug
    // untouched must not collide with itself.
    if (slug !== undefined && slug !== existing.slug) {
      const duplicate = await prisma.blogPost.findFirst({
        where: { slug, NOT: { id } },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: 'A post with this slug already exists' },
          { status: 400 }
        );
      }
    }

    let imageUrl = existing.image;
    let imagePublicId = existing.imagePublicId;

    if (imageFile instanceof File) {
      const v = validateImageFile(imageFile);
      if (!v.valid) {
        return NextResponse.json({ error: v.error }, { status: 400 });
      }
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const result = await uploadImage(buffer, 'blog');
      if (existing.imagePublicId) {
        await deleteFromCloudinary(existing.imagePublicId).catch(() => {});
      }
      imageUrl = result.url;
      imagePublicId = result.publicId;
    }

    const published =
      isPublished !== undefined
        ? isPublished === true || isPublished === 'true'
        : existing.isPublished;
    const featured = isFeatured === true || isFeatured === 'true';

    // Stamped on the first trip to live and then frozen: an unpublish/republish
    // cycle, or any later edit, must not shuffle the post back to the top of the
    // feed.
    const firstPublish = published && existing.publishedAt === null;

    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(slug !== undefined && { slug }),
        ...(excerpt !== undefined && { excerpt }),
        ...(category !== undefined && { category }),
        ...(authorName !== undefined && { authorName: authorName || null }),
        // Reading time is a function of the body, so it is recomputed rather
        // than accepted from the client whenever the body is part of the edit.
        ...(content !== undefined && {
          content,
          readMinutes: estimateReadMinutes(content),
        }),
        ...(isPublished !== undefined && { isPublished: published }),
        ...(isFeatured !== undefined && { isFeatured: featured }),
        ...(firstPublish && { publishedAt: new Date() }),
        image: imageUrl,
        imagePublicId,
      },
    });

    if (isFeatured !== undefined && featured) {
      await prisma.blogPost.updateMany({
        where: { isFeatured: true, NOT: { id } },
        data: { isFeatured: false },
      });
    }

    return NextResponse.json(post);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const admin = requireAdmin(r);
    if (admin) return admin;
    const { id } = await context.params;

    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });
    }

    if (post.imagePublicId) {
      await deleteFromCloudinary(post.imagePublicId).catch(() => {});
    }

    await prisma.blogPost.delete({ where: { id } });

    return NextResponse.json({ message: 'Blog post deleted successfully' });
  } catch (error) {
    return apiError(error);
  }
}
