import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { uploadImage, deleteFromCloudinary } from '@/lib/cloudinary';
import { validateImageFile } from '@/lib/upload';
import { requireAuth, requireAdmin } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Update a promotional banner.
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

    const existing = await prisma.promotionalBanner.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const dataJson = formData.get('data');
    const data = typeof dataJson === 'string' ? JSON.parse(dataJson) : {};
    const imageFile = formData.get('image');

    const { title, description, link, backgroundColor, order, isActive } = data;

    let imageUrl = existing.image;
    let imagePublicId = existing.imagePublicId;

    if (imageFile instanceof File) {
      const v = validateImageFile(imageFile);
      if (!v.valid) {
        return NextResponse.json({ error: v.error }, { status: 400 });
      }
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const result = await uploadImage(buffer, 'banners');
      // Remove the old image now that the new one is uploaded.
      if (existing.imagePublicId) {
        await deleteFromCloudinary(existing.imagePublicId).catch(() => {});
      }
      imageUrl = result.url;
      imagePublicId = result.publicId;
    }

    const banner = await prisma.promotionalBanner.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description: description || null }),
        ...(link !== undefined && { link: link || null }),
        ...(backgroundColor !== undefined && {
          backgroundColor: backgroundColor || null,
        }),
        ...(order !== undefined && { order: parseInt(String(order)) || 0 }),
        ...(isActive !== undefined && {
          isActive: isActive === true || isActive === 'true',
        }),
        image: imageUrl,
        imagePublicId,
      },
    });

    return NextResponse.json(banner);
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

    const banner = await prisma.promotionalBanner.findUnique({ where: { id } });
    if (!banner) {
      return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
    }

    if (banner.imagePublicId) {
      await deleteFromCloudinary(banner.imagePublicId).catch(() => {});
    }

    await prisma.promotionalBanner.delete({ where: { id } });

    return NextResponse.json({ message: 'Banner deleted successfully' });
  } catch (error) {
    return apiError(error);
  }
}
