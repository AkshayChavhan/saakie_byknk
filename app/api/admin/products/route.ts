import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user and check if admin
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all products with category and images
    const products = await prisma.product.findMany({
      include: {
        category: {
          select: {
            name: true
          }
        },
        images: {
          select: {
            url: true,
            isPrimary: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error('Products API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user and check if admin
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const productData = await request.json()

    // Create the product
    const product = await prisma.product.create({
      data: {
        name: productData.name,
        slug: productData.slug,
        description: productData.description,
        price: productData.price,
        comparePrice: productData.compareAtPrice,
        stock: productData.stock,
        lowStockAlert: productData.lowStockAlert,
        categoryId: productData.categoryId,
        material: productData.material,
        pattern: productData.pattern,
        occasion: productData.occasion ? [productData.occasion] : [],
        careInstructions: productData.careInstructions,
        weight: productData.weight,
        blouseIncluded: productData.blouseIncluded,
        isActive: productData.isActive,
        isFeatured: productData.isFeatured,
        // Create dimensions if provided
        ...(productData.length && productData.width && {
          dimensions: {
            create: {
              length: productData.length,
              width: productData.width,
              height: 0.1 // Default height for sarees
            }
          }
        })
      },
      include: {
        category: {
          select: {
            name: true
          }
        },
        images: {
          select: {
            url: true,
            isPrimary: true
          }
        },
        dimensions: true
      }
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error('Create product API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}