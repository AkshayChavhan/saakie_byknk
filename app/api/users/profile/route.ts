import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { uploadImage } from '@/lib/cloudinary';
import { validateImageFile } from '@/lib/upload';
import { requireAuth } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET — the signed-in user's editable profile.
 */
export async function GET() {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;

    const user = await prisma.user.findUnique({
      where: { id: r.id },
      select: { id: true, name: true, email: true, phone: true, imageUrl: true, role: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error) {
    return apiError(error);
  }
}

/**
 * PATCH — update the signed-in user's own name / phone / profile image.
 *
 * Accepts multipart/form-data:
 *   - name?:  string
 *   - phone?: string
 *   - image?: File   (optional new profile photo → Cloudinary → User.imageUrl)
 *
 * Only the fields provided are changed. A user can only edit themselves.
 */
export async function PATCH(request: Request) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;

    const form = await request.formData();
    const data: { name?: string; phone?: string; imageUrl?: string } = {};

    if (form.has('name')) {
      const name = String(form.get('name') ?? '').trim();
      if (!name) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
      if (name.length > 80) return NextResponse.json({ error: 'Name is too long' }, { status: 400 });
      data.name = name;
    }

    if (form.has('phone')) {
      const phone = String(form.get('phone') ?? '').trim();
      if (phone) {
        const digits = phone.replace(/\D/g, '');
        if (digits.length < 10) {
          return NextResponse.json({ error: 'Enter a valid phone number' }, { status: 400 });
        }
      }
      data.phone = phone || '';
    }

    const image = form.get('image');
    if (image instanceof File && image.size > 0) {
      const v = validateImageFile(image);
      if (!v.valid) return NextResponse.json({ error: v.error }, { status: 400 });
      const buffer = Buffer.from(await image.arrayBuffer());
      const uploaded = await uploadImage(buffer, 'profiles');
      data.imageUrl = uploaded.url;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: r.id },
      data,
      select: { id: true, name: true, email: true, phone: true, imageUrl: true, role: true },
    });

    return NextResponse.json(user);
  } catch (error) {
    return apiError(error);
  }
}
