import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        isFeatured: true
      },
      select: {
        id: true,
        name: true,
        price: true,
        comparePrice: true,
        images: {
          select: { url: true },
          take: 1
        },
        colors: {
          select: { 
            name: true,
            hexCode: true 
          }
        },
        reviews: {
          select: {
            rating: true
          }
        },
        _count: {
          select: { reviews: true }
        },
        createdAt: true
      },
      take: 8,
      orderBy: {
        createdAt: 'desc'
      }
    })

    const formattedProducts = products.map(product => {
      const averageRating = product.reviews.length > 0
        ? product.reviews.reduce((sum: number, review: { rating: number }) => sum + review.rating, 0) / product.reviews.length
        : 0

      // Determine if product is new (created within last 30 days)
      const isNew = new Date(product.createdAt).getTime() > Date.now() - (30 * 24 * 60 * 60 * 1000)
      
      // Determine if bestseller (has more than 50 reviews and rating > 4.5)
      const isBestseller = product._count.reviews > 50 && averageRating > 4.5

      return {
        id: product.id,
        name: product.name,
        price: product.price,
        comparePrice: product.comparePrice || product.price * 1.3, // Default to 30% markup if no compare price
        rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        reviews: product._count.reviews,
        image: product.images[0]?.url || '/images/placeholder-product.jpg',
        colors: product.colors.map((color: { hexCode: string }) => color.hexCode || '#000000'),
        isNew,
        isBestseller
      }
    })

    return NextResponse.json(formattedProducts)
  } catch (error) {
    console.error('Featured products API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}