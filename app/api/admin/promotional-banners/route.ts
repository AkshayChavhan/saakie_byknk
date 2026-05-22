import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { uploadImage } from '@/lib/cloudinary';
import { validateImageFile } from '@/lib/upload';
import { requireAuth, requireAdmin } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const admin = requireAdmin(r);
    if (admin) return admin;

    const banners = await prisma.promotionalBanner.findMany({
      orderBy: { order: 'asc' },
    });

    return NextResponse.json(banners);
  } catch (error) {
    return apiError(error);
  }
}

/**
 * Create a promotional banner.
 * Accepts multipart/form-data: a JSON `data` field plus an optional `image` file.
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

    const { title, description, link, backgroundColor, order, isActive = true } = data;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    let imageUrl: string | null = null;
    let imagePublicId: string | null = null;

    if (imageFile instanceof File) {
      const v = validateImageFile(imageFile);
      if (!v.valid) {
        return NextResponse.json({ error: v.error }, { status: 400 });
      }
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const result = await uploadImage(buffer, 'banners');
      imageUrl = result.url;
      imagePublicId = result.publicId;
    }

    const banner = await prisma.promotionalBanner.create({
      data: {
        title,
        description: description || null,
        image: imageUrl,
        imagePublicId,
        link: link || null,
        backgroundColor: backgroundColor || null,
        order: order != null ? parseInt(String(order)) || 0 : 0,
        isActive: isActive === true || isActive === 'true',
      },
    });

    return NextResponse.json(banner, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
