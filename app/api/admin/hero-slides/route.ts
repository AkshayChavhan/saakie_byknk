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

    const slides = await prisma.heroSlide.findMany({
      orderBy: { order: 'asc' },
    });

    return NextResponse.json(slides);
  } catch (error) {
    return apiError(error);
  }
}

/**
 * Create a hero slide.
 * multipart/form-data: a JSON `data` field plus a required `image` file
 * (HeroSlide.image is non-nullable).
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
      subtitle,
      description,
      ctaText,
      ctaLink,
      order,
      isActive = true,
    } = data;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!(imageFile instanceof File)) {
      return NextResponse.json({ error: 'An image is required' }, { status: 400 });
    }

    const v = validateImageFile(imageFile);
    if (!v.valid) {
      return NextResponse.json({ error: v.error }, { status: 400 });
    }
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    const result = await uploadImage(buffer, 'hero-slides');

    const slide = await prisma.heroSlide.create({
      data: {
        title,
        subtitle: subtitle || null,
        description: description || null,
        image: result.url,
        imagePublicId: result.publicId,
        ctaText: ctaText || null,
        ctaLink: ctaLink || null,
        order: order != null ? parseInt(String(order)) || 0 : 0,
        isActive: isActive === true || isActive === 'true',
      },
    });

    return NextResponse.json(slide, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
