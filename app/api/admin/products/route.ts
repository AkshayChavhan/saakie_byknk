import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireAdmin } from '@/lib/server/auth';
import { apiError } from '@/lib/server/errors';
import { markProduct } from '@/lib/server/watermark';
import { invalidate, TAG } from '@/lib/server/cache';
import { parseLimit, parsePage, productCreateSchema, validateBody } from '@/lib/server/validation';
import { getCategoryScopeIds } from '@/lib/server/category-counts';
import { IMAGE_ORDER } from '@/lib/server/image-order';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const r = await requireAuth();
    if (r instanceof NextResponse) return r;
    const admin = requireAdmin(r);
    if (admin) return admin;

    const { searchParams } = new URL(request.url);
    const pageNum = parsePage(searchParams.get('page'));
    const limitNum = parseLimit(searchParams.get('limit'), 20);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    // A product filed under a sub-category still belongs to its parent, so
    // filtering by the parent includes everything beneath it.
    if (category) where.categoryId = { in: await getCategoryScopeIds(category) };

    // The admin table's status dropdown. Search, filter and paginate here so
    // the table covers the whole catalogue, not the first page of it.
    const lowStock = { stock: { lte: prisma.product.fields.lowStockAlert } };
    switch (status) {
      case 'active':
        where.isActive = true;
        break;
      case 'inactive':
        where.isActive = false;
        break;
      case 'featured':
        where.isFeatured = true;
        break;
      case 'low_stock':
        Object.assign(where, lowStock);
        break;
      case 'out_of_stock':
        where.stock = 0;
        break;
    }

    const [products, totalCount, total, active, lowStockCount, outOfStock] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          images: { take: 1, orderBy: IMAGE_ORDER },
          _count: { select: { orderItems: true, reviews: true } },
        },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
      // Catalogue-wide figures for the summary cards, independent of filters.
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({ where: { ...lowStock, stock: { ...lowStock.stock, gt: 0 } } }),
      prisma.product.count({ where: { stock: 0 } }),
    ]);

    return NextResponse.json({
      products: products.map(markProduct),
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
      stats: { total, active, lowStock: lowStockCount, outOfStock },
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

    const parsed = validateBody(productCreateSchema, await request.json().catch(() => null));
    if (parsed instanceof NextResponse) return parsed;
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
      isActive,
      isFeatured,
    } = parsed;

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
        images: { orderBy: IMAGE_ORDER },
        colors: true,
        sizes: true,
      },
    });

    invalidate(TAG.products, TAG.categories);
    return NextResponse.json(markProduct(product), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
