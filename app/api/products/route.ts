import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    console.log('Products API called')
    
    // First, let's try a very simple query
    const products = await prisma.product.findMany({
      where: {
        isActive: true
      },
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
        }
      },
      take: 12,
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log('Found products:', products.length)

    const formattedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      comparePrice: product.comparePrice || product.price * 1.3,
      rating: 4.5, // Hardcoded for now
      reviews: 0, // Hardcoded for now
      image: product.images[0]?.url || '/images/placeholder-product.jpg',
      colors: ['#000000'], // Hardcoded for now
      category: product.category,
      stock: product.stock,
      isNew: new Date(product.createdAt).getTime() > Date.now() - (30 * 24 * 60 * 60 * 1000),
      isBestseller: false, // Hardcoded for now
      inStock: product.stock > 0
    }))

    return NextResponse.json({
      products: formattedProducts,
      pagination: {
        page: 1,
        limit: 12,
        totalCount: products.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    })
  } catch (error) {
    console.error('Products API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}