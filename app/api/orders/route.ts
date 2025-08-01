import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { auth } from '@clerk/nextjs/server'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      productId,
      productName,
      selectedColor,
      selectedSize,
      quantity,
      price,
      total,
      name,
      phone,
      address,
      city,
      pincode,
      paymentMethod
    } = body

    console.log('Creating order:', body)

    // Try to get authenticated user
    const { userId: clerkUserId } = await auth()
    
    // Generate order number
    const orderNumber = `COD${Date.now()}`

    // If user is logged in, get their database user
    let dbUserId = null
    if (clerkUserId) {
      const user = await prisma.user.findUnique({
        where: { clerkId: clerkUserId }
      })
      dbUserId = user?.id
    }

    // For guest checkout, create a temporary address without user association
    const tempAddress = await prisma.address.create({
      data: {
        name,
        phone,
        addressLine1: address,
        city,
        pincode,
        state: 'Unknown', // You might want to add state to the form
        country: 'India',
        isDefault: false,
        ...(dbUserId ? { userId: dbUserId } : {})
      }
    })

    // Create order without requiring user
    const order = await prisma.order.create({
      data: {
        orderNumber,
        ...(dbUserId ? { userId: dbUserId } : {}),
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod: paymentMethod || 'COD',
        subtotal: total,
        tax: 0,
        shipping: 0,
        discount: 0,
        total: total,
        shippingAddressId: tempAddress.id,
        billingAddressId: tempAddress.id,
        items: {
          create: [
            {
              productId,
              quantity,
              price,
              total: price * quantity
            }
          ]
        },
        notes: `COD Order - Color: ${selectedColor}, Size: ${selectedSize}`
      },
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

    // Update product stock
    await prisma.product.update({
      where: { id: productId },
      data: {
        stock: {
          decrement: quantity
        }
      }
    })

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: order.total,
        items: order.items,
        shippingAddress: order.shippingAddress
      }
    })
  } catch (error) {
    console.error('Order creation error:', error)
    
    // Handle specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json({ 
          error: 'Product not found or invalid data',
          details: error.message 
        }, { status: 400 })
      }
    }
    
    return NextResponse.json({ 
      error: 'Failed to create order',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const paymentStatus = searchParams.get('paymentStatus')
    
    const where: any = {}
    if (status) where.status = status
    if (paymentStatus) where.paymentStatus = paymentStatus

    const orders = await prisma.order.findMany({
      where,
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
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error('Orders fetch error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch orders',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}