import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireAdmin } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const admin = requireAdmin(r);
    if (admin) return admin;

    const { searchParams } = new URL(request.url);
    const pageNum = parseInt(searchParams.get('page') ?? '1');
    const limitNum = parseInt(searchParams.get('limit') ?? '20');
    const search = searchParams.get('search');
    const category = searchParams.get('category');

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) where.categoryId = category;

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          images: { take: 1 },
          _count: { select: { orderItems: true, reviews: true } },
        },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
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

    const {
      name,
      slug,
      description,
      price,
      comparePrice,
      stock,
      categoryId,
      images,
      colors,
      sizes,
      isActive = true,
      isFeatured = false,
    } = await request.json();

    if (!name || !slug || !price || !categoryId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existingProduct = await prisma.product.findUnique({ where: { slug } });
    if (existingProduct) {
      return NextResponse.json(
        { error: 'Product with this slug already exists' },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description: description || '',
        price,
        comparePrice,
        stock: stock || 0,
        categoryId,
        isActive,
        isFeatured,
        images: images
          ? {
              create: images.map((img: { url: string }, index: number) => ({
                url: img.url,
                order: index,
              })),
            }
          : undefined,
        colors: colors
          ? {
              create: colors.map((color: { name: string; hexCode: string }) => ({
                name: color.name,
                hexCode: color.hexCode,
              })),
            }
          : undefined,
        sizes: sizes
          ? {
              create: sizes.map((size: { name: string }) => ({ name: size.name })),
            }
          : undefined,
      },
      include: {
        category: true,
        images: true,
        colors: true,
        sizes: true,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
