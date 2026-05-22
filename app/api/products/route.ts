import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { apiError } from '@/lib/server/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') ?? 'newest';
    const minPrice = searchParams.get('minPrice') ?? '0';
    const maxPrice = searchParams.get('maxPrice') ?? '999999';
    const inStock = searchParams.get('inStock');
    const page = searchParams.get('page') ?? '1';
    const limit = searchParams.get('limit') ?? '12';

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const minPriceNum = parseInt(minPrice);
    const maxPriceNum = parseInt(maxPrice);

    const where: any = { isActive: true };

    if (category) {
      const categoryRecord = await prisma.category.findUnique({
        where: { slug: category },
        select: { id: true },
      });
      if (categoryRecord) where.categoryId = categoryRecord.id;
    }

    if (minPriceNum > 0 || maxPriceNum < 999999) {
      where.price = { gte: minPriceNum, lte: maxPriceNum };
    }

    if (inStock === 'true') where.stock = { gt: 0 };

    // Free-text search across product name, description, and tags.
    if (search?.trim()) {
      const term = search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { tags: { has: term } },
      ];
    }

    let orderBy: any = {};
    switch (sort) {
      case 'price-low':
        orderBy = { price: 'asc' };
        break;
      case 'price-high':
        orderBy = { price: 'desc' };
        break;
      case 'popular':
        orderBy = { orderItems: { _count: 'desc' } };
        break;
      case 'rating':
        orderBy = { reviews: { _count: 'desc' } };
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
    }

    const totalCount = await prisma.product.count({ where });

    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        comparePrice: true,
        stock: true,
        createdAt: true,
        images: { select: { url: true }, take: 1 },
        category: { select: { name: true, slug: true } },
        _count: { select: { reviews: true, orderItems: true } },
      },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy,
    });

    const formattedProducts = products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      comparePrice: product.comparePrice || product.price * 1.3,
      rating: product._count.reviews > 0 ? 4.5 : 0,
      reviews: product._count.reviews,
      image: product.images[0]?.url || '/images/placeholder-product.jpg',
      colors: ['#000000'],
      category: product.category,
      stock: product.stock,
      isNew:
        new Date(product.createdAt).getTime() >
        Date.now() - 30 * 24 * 60 * 60 * 1000,
      isBestseller: product._count.orderItems > 10,
      inStock: product.stock > 0,
    }));

    const totalPages = Math.ceil(totalCount / limitNum);

    return NextResponse.json({
      products: formattedProducts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
