import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { auth } from '@clerk/nextjs/server'

const prisma = new PrismaClient()

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    const { id } = params
    const body = await request.json()
    const { status, paymentStatus } = body

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updateData: any = {}
    if (status) updateData.status = status
    if (paymentStatus) updateData.paymentStatus = paymentStatus

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                images: {
                  select: { url: true },
                  take: 1
                }
              }
            }
          }
        },
        shippingAddress: true
      }
    })

    return NextResponse.json({ success: true, order })
  } catch (error) {
    console.error('Order update error:', error)
    return NextResponse.json({ 
      error: 'Failed to update order',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                images: {
                  select: { url: true },
                  take: 1
                }
              }
            }
          }
        },
        shippingAddress: true
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Order fetch error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch order',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}