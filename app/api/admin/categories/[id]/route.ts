import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireAdmin } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';
import { invalidate, TAG } from '@/lib/server/cache';
import { categoryUpdateSchema, validateBody } from '@/lib/server/validation';
import { deleteImage, uploadImage, type CloudinaryUploadResult } from '@/lib/cloudinary';
import { validateImageFile } from '@/lib/upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Room for the Cloudinary upload when the edit form sends a new image.
export const maxDuration = 60;

/**
 * Read a PATCH body. The admin edit form sends multipart/form-data: the
 * fields as JSON in `data`, plus an optional `image` file. The list's quick
 * toggles (active on/off) send plain JSON. Both land here.
 */
async function readUpdate(request: Request): Promise<{ body: unknown; imageFile: File | null }> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('multipart/form-data')) {
    return { body: await request.json().catch(() => null), imageFile: null };
  }
  const form = await request.formData();
  const raw = form.get('data');
  let body: unknown = {};
  if (typeof raw === 'string') {
    try {
      body = JSON.parse(raw);
    } catch {
      body = null;
    }
  }
  const file = form.get('image');
  return { body, imageFile: file instanceof File && file.size > 0 ? file : null };
}

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

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        products: { take: 10, orderBy: { createdAt: 'desc' } },
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    return apiError(error);
  }
}

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

    const { body, imageFile } = await readUpdate(request);
    // `removeImage: true` clears the picture; the schema itself drops the key.
    const removeImage =
      typeof body === 'object' && body !== null && (body as { removeImage?: unknown }).removeImage === true;
    const parsed = validateBody(categoryUpdateSchema, body);
    if (parsed instanceof NextResponse) return parsed;
    const { name, slug, description, image, parentId, isActive } = parsed;

    if (parentId && parentId === id) {
      return NextResponse.json(
        { error: 'A category cannot be its own parent' },
        { status: 400 }
      );
    }

    const existing = await prisma.category.findUnique({
      where: { id },
      select: { id: true, imagePublicId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    if (slug) {
      const existingCategory = await prisma.category.findFirst({
        where: { slug, NOT: { id } },
      });

      if (existingCategory) {
        return NextResponse.json(
          { error: 'Category with this slug already exists' },
          { status: 400 }
        );
      }
    }

    // A new picture goes to Cloudinary before the row changes, so a failed
    // upload leaves the category exactly as it was.
    let uploaded: CloudinaryUploadResult | null = null;
    if (imageFile) {
      const v = validateImageFile(imageFile);
      if (!v.valid) {
        return NextResponse.json({ error: v.error }, { status: 400 });
      }
      try {
        uploaded = await uploadImage(Buffer.from(await imageFile.arrayBuffer()), 'categories');
      } catch (uploadError) {
        console.error('Error uploading category image to Cloudinary:', uploadError);
        return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
      }
    }

    const imageData = uploaded
      ? {
          image: uploaded.url,
          imagePublicId: uploaded.publicId,
          imageWidth: uploaded.width ?? null,
          imageHeight: uploaded.height ?? null,
          imageFormat: uploaded.format ?? null,
        }
      : removeImage
        ? { image: null, imagePublicId: null, imageWidth: null, imageHeight: null, imageFormat: null }
        : image !== undefined
          ? { image }
          : {};

    let category;
    try {
      category = await prisma.category.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(slug && { slug }),
          ...(description !== undefined && { description }),
          ...imageData,
          ...(parentId !== undefined && { parentId: parentId || null }),
          ...(isActive !== undefined && { isActive }),
        },
        include: {
          parent: { select: { id: true, name: true } },
          children: { select: { id: true, name: true } },
          _count: { select: { products: true, children: true } },
        },
      });
    } catch (error) {
      // The row did not change: do not leave the new upload orphaned.
      if (uploaded?.publicId) await deleteImage(uploaded.publicId).catch(() => {});
      throw error;
    }

    // The old picture was replaced or removed: drop it from Cloudinary.
    // Best effort, the category is already saved.
    if ((uploaded || removeImage) && existing.imagePublicId && existing.imagePublicId !== uploaded?.publicId) {
      await deleteImage(existing.imagePublicId).catch((err) =>
        console.warn('Could not delete the old category image:', err)
      );
    }

    invalidate(TAG.categories);
    return NextResponse.json(category);
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

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true, children: true } },
      },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    if (category._count.children > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete category with ${category._count.children} subcategories. Delete or reassign subcategories first.`,
        },
        { status: 400 }
      );
    }

    if (category._count.products > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete category with ${category._count.products} products. Move or delete products first.`,
        },
        { status: 400 }
      );
    }

    if (category.imagePublicId) {
      try {
        await deleteImage(category.imagePublicId);
      } catch (deleteError) {
        console.error('Error deleting category image from Cloudinary:', deleteError);
      }
    }

    await prisma.category.delete({ where: { id } });

    invalidate(TAG.categories);
    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error) {
    return apiError(error);
  }
}
