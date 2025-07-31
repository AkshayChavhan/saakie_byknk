import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    console.log('Fetching product with slug:', slug)

    const product = await prisma.product.findUnique({
      where: {
        slug: slug,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        details: true,
        price: true,
        comparePrice: true,
        stock: true,
        brand: true,
        material: true,
        careInstructions: true,
        occasion: true,
        pattern: true,
        fabric: true,
        workType: true,
        blouseIncluded: true,
        weight: true,
        createdAt: true,
        images: {
          select: {
            id: true,
            url: true,
            alt: true,
            isPrimary: true
          },
          orderBy: [
            { isPrimary: 'desc' },
            { id: 'asc' }
          ]
        },
        colors: {
          select: {
            id: true,
            name: true,
            hexCode: true
          }
        },
        sizes: {
          select: {
            id: true,
            name: true
          }
        },
        variants: {
          select: {
            id: true,
            sku: true,
            price: true,
            stock: true,
            image: true,
            color: {
              select: {
                id: true,
                name: true,
                hexCode: true
              }
            },
            size: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        reviews: {
          select: {
            id: true,
            rating: true,
            title: true,
            comment: true,
            images: true,
            isVerified: true,
            createdAt: true,
            user: {
              select: {
                name: true,
                imageUrl: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        },
        _count: {
          select: {
            reviews: true,
            orderItems: true
          }
        },
        dimensions: {
          select: {
            length: true,
            width: true,
            height: true
          }
        }
      }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Calculate average rating
    const averageRating = product.reviews.length > 0
      ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
      : 0

    // Get related products (same category, different product)
    const relatedProducts = await prisma.product.findMany({
      where: {
        categoryId: product.category.id,
        id: { not: product.id },
        isActive: true
      },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        comparePrice: true,
        images: {
          select: { url: true },
          take: 1
        }
      },
      take: 4,
      orderBy: {
        createdAt: 'desc'
      }
    })

    const formattedProduct = {
      ...product,
      rating: Math.round(averageRating * 10) / 10,
      reviewCount: product._count.reviews,
      salesCount: product._count.orderItems,
      isNew: new Date(product.createdAt).getTime() > Date.now() - (30 * 24 * 60 * 60 * 1000),
      isBestseller: product._count.orderItems > 50 && averageRating > 4.5,
      inStock: product.stock > 0,
      relatedProducts: relatedProducts.map(rp => ({
        ...rp,
        image: rp.images[0]?.url || '/images/placeholder-product.jpg',
        comparePrice: rp.comparePrice || rp.price * 1.3
      }))
    }

    return NextResponse.json(formattedProduct)
  } catch (error) {
    console.error('Product detail API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}