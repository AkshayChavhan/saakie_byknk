import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireAdmin } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const admin = requireAdmin(r);
    if (admin) return admin;

    const categories = await prisma.category.findMany({
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true } },
        _count: { select: { products: true, children: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(categories);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const admin = requireAdmin(r);
    if (admin) return admin;

    const { name, slug, description, image, parentId, isActive = true } = await request.json();

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

    const category = await prisma.category.create({
      data: { name, slug, description, image, parentId: parentId || null, isActive },
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true } },
        _count: { select: { products: true, children: true } },
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
