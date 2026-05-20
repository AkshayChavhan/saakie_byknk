import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { uploadImage } from '@/lib/cloudinary';
import { validateImageFile } from '@/lib/upload';
import { requireAuth, requireAdmin } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const admin = requireAdmin(r);
    if (admin) return admin;

    const formData = await request.formData();
    const dataJson = formData.get('data');
    const image = formData.get('image');

    const data = typeof dataJson === 'string' ? JSON.parse(dataJson) : {};
    const { name, slug, description, parentId, isActive = true } = data;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    const existingCategory = await prisma.category.findUnique({ where: { slug } });
    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category with this slug already exists' },
        { status: 400 }
      );
    }

    let imageUrl: string | null = null;
    let imagePublicId: string | null = null;
    let imageWidth: number | null = null;
    let imageHeight: number | null = null;
    let imageFormat: string | null = null;

    if (image instanceof File) {
      const v = validateImageFile(image);
      if (!v.valid) {
        return NextResponse.json({ error: v.error }, { status: 400 });
      }
      try {
        const buffer = Buffer.from(await image.arrayBuffer());
        const result = await uploadImage(buffer, 'categories');
        imageUrl = result.url;
        imagePublicId = result.publicId;
        imageWidth = result.width ?? null;
        imageHeight = result.height ?? null;
        imageFormat = result.format ?? null;
      } catch (uploadError) {
        console.error('Error uploading image to Cloudinary:', uploadError);
        return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
      }
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description,
        image: imageUrl,
        imagePublicId,
        imageWidth,
        imageHeight,
        imageFormat,
        parentId: parentId || null,
        isActive,
      },
      include: {
        _count: { select: { products: true } },
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
