import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const { role } = await request.json()

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: { role }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('User update API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user and check if super admin
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete user and all related data
    await prisma.$transaction([
      prisma.cartItem.deleteMany({ where: { cart: { userId: params.id } } }),
      prisma.cart.deleteMany({ where: { userId: params.id } }),
      prisma.wishlistItem.deleteMany({ where: { wishlist: { userId: params.id } } }),
      prisma.wishlist.deleteMany({ where: { userId: params.id } }),
      prisma.review.deleteMany({ where: { userId: params.id } }),
      prisma.order.deleteMany({ where: { userId: params.id } }),
      prisma.address.deleteMany({ where: { userId: params.id } }),
      prisma.user.delete({ where: { id: params.id } })
    ])

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('User delete API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}