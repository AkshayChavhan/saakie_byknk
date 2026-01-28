import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

// GET - Fetch user's wishlist
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find user by clerkId
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Find wishlist separately
    const wishlist = await prisma.wishlist.findUnique({
      where: { userId: user.id },
    })

    if (!wishlist) {
      return NextResponse.json({ items: [] })
    }

    // Fetch wishlist items with product details
    const items = await prisma.wishlistItem.findMany({
      where: { wishlistId: wishlist.id },
      include: {
        product: {
          include: {
            images: true,
            category: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: {
        addedAt: 'desc',
      },
    })

    // Filter to get primary images or first image
    const itemsWithPrimaryImage = items.map((item) => ({
      ...item,
      product: {
        ...item.product,
        images: item.product.images.filter((img) => img.isPrimary).length > 0
          ? item.product.images.filter((img) => img.isPrimary)
          : item.product.images.slice(0, 1),
      },
    }))

    return NextResponse.json({
      items: itemsWithPrimaryImage,
    })
  } catch (error) {
    console.error('Error fetching wishlist:', error)
    return NextResponse.json(
      { error: 'Failed to fetch wishlist' },
      { status: 500 }
    )
  }
}

// POST - Add item to wishlist
export async function POST(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId } = await request.json()

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    // Find user by clerkId
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Find or create wishlist
    let wishlist = await prisma.wishlist.findUnique({
      where: { userId: user.id },
    })

    if (!wishlist) {
      wishlist = await prisma.wishlist.create({
        data: {
          userId: user.id,
        },
      })
    }

    // Check if item already in wishlist
    const existingItem = await prisma.wishlistItem.findFirst({
      where: {
        wishlistId: wishlist.id,
        productId: productId,
      },
    })

    if (existingItem) {
      return NextResponse.json(
        { error: 'Item already in wishlist', item: existingItem },
        { status: 409 }
      )
    }

    // Add item to wishlist
    const wishlistItem = await prisma.wishlistItem.create({
      data: {
        wishlistId: wishlist.id,
        productId: productId,
      },
    })

    // Fetch the complete item with product details separately
    const completeItem = await prisma.wishlistItem.findUnique({
      where: { id: wishlistItem.id },
      include: {
        product: {
          include: {
            images: true,
            category: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(completeItem, { status: 201 })
  } catch (error) {
    console.error('Error adding to wishlist:', error)
    return NextResponse.json(
      { error: 'Failed to add to wishlist' },
      { status: 500 }
    )
  }
}
