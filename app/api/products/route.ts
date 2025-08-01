import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    console.log('Products API called')
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const sort = searchParams.get('sort') || 'newest'
    const minPrice = parseInt(searchParams.get('minPrice') || '0')
    const maxPrice = parseInt(searchParams.get('maxPrice') || '999999')
    const inStock = searchParams.get('inStock') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    
    // Build where clause
    const where: any = {
      isActive: true
    }
    
    if (category) {
      const categoryRecord = await prisma.category.findUnique({
        where: { slug: category },
        select: { id: true }
      })
      if (categoryRecord) {
        where.categoryId = categoryRecord.id
      }
    }
    
    if (minPrice > 0 || maxPrice < 999999) {
      where.price = {
        gte: minPrice,
        lte: maxPrice
      }
    }
    
    if (inStock) {
      where.stock = { gt: 0 }
    }
    
    // Build orderBy
    let orderBy: any = {}
    switch (sort) {
      case 'price-low':
        orderBy = { price: 'asc' }
        break
      case 'price-high':
        orderBy = { price: 'desc' }
        break
      case 'popular':
        orderBy = { orderItems: { _count: 'desc' } }
        break
      case 'rating':
        orderBy = { reviews: { _count: 'desc' } }
        break
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' }
    }
    
    // Get total count
    const totalCount = await prisma.product.count({ where })
    
    // Get products
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
        images: {
          select: { url: true },
          take: 1
        },
        category: {
          select: {
            name: true,
            slug: true
          }
        },
        _count: {
          select: {
            reviews: true,
            orderItems: true
          }
        }
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy
    })

    console.log('Found products:', products.length)

    const formattedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      comparePrice: product.comparePrice || product.price * 1.3,
      rating: product._count.reviews > 0 ? 4.5 : 0, // TODO: Calculate actual average
      reviews: product._count.reviews,
      image: product.images[0]?.url || '/images/placeholder-product.jpg',
      colors: ['#000000'], // TODO: Get actual colors
      category: product.category,
      stock: product.stock,
      isNew: new Date(product.createdAt).getTime() > Date.now() - (30 * 24 * 60 * 60 * 1000),
      isBestseller: product._count.orderItems > 10,
      inStock: product.stock > 0
    }))

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      products: formattedProducts,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })
  } catch (error) {
    console.error('Products API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}