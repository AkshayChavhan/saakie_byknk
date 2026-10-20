import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { uploadImage, deleteFromCloudinary } from '@/lib/cloudinary';
import { validateImageFile } from '@/lib/upload';
import { parseHeroSlideDevice } from '@/lib/hero-slide-device';
import { requireAuth, requireAdmin } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';
import { invalidate, TAG } from '@/lib/server/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Update a hero slide.
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

    const existing = await prisma.heroSlide.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Hero slide not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const dataJson = formData.get('data');
    const data = typeof dataJson === 'string' ? JSON.parse(dataJson) : {};
    const imageFile = formData.get('image');

    const { title, subtitle, description, ctaText, ctaLink, order, isActive, device: rawDevice } = data;

    const device = rawDevice === undefined ? undefined : parseHeroSlideDevice(rawDevice);
    if (device === null) {
      return NextResponse.json({ error: 'device must be DESKTOP or MOBILE' }, { status: 400 });
    }

    let imageUrl = existing.image;
    let imagePublicId = existing.imagePublicId;

    if (imageFile instanceof File) {
      const v = validateImageFile(imageFile);
      if (!v.valid) {
        return NextResponse.json({ error: v.error }, { status: 400 });
      }
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const result = await uploadImage(buffer, 'hero-slides');
      if (existing.imagePublicId) {
        await deleteFromCloudinary(existing.imagePublicId).catch(() => {});
      }
      imageUrl = result.url;
      imagePublicId = result.publicId;
    }

    const slide = await prisma.heroSlide.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(subtitle !== undefined && { subtitle: subtitle || null }),
        ...(description !== undefined && { description: description || null }),
        ...(ctaText !== undefined && { ctaText: ctaText || null }),
        ...(ctaLink !== undefined && { ctaLink: ctaLink || null }),
        ...(device !== undefined && { device }),
        ...(order !== undefined && { order: parseInt(String(order)) || 0 }),
        ...(isActive !== undefined && {
          isActive: isActive === true || isActive === 'true',
        }),
        image: imageUrl,
        imagePublicId,
      },
    });

    invalidate(TAG.heroSlides);
    return NextResponse.json(slide);
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

    const slide = await prisma.heroSlide.findUnique({ where: { id } });
    if (!slide) {
      return NextResponse.json({ error: 'Hero slide not found' }, { status: 404 });
    }

    if (slide.imagePublicId) {
      await deleteFromCloudinary(slide.imagePublicId).catch(() => {});
    }

    await prisma.heroSlide.delete({ where: { id } });

    invalidate(TAG.heroSlides);
    return NextResponse.json({ message: 'Hero slide deleted successfully' });
  } catch (error) {
    return apiError(error);
  }
}
