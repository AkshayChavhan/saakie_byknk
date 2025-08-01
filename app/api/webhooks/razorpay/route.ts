import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import crypto from 'crypto'
import { razorpay, isRazorpayEnabled } from '@/lib/razorpay'
import { prisma as db } from '@/lib/db'

const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  try {
    // Check if Razorpay is enabled
    if (!isRazorpayEnabled() || !webhookSecret) {
      return NextResponse.json(
        { error: 'Razorpay is not configured' },
        { status: 503 }
      )
    }
    const body = await request.text()
    const signature = (await headers()).get('x-razorpay-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing x-razorpay-signature header' },
        { status: 400 }
      )
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex')

    if (expectedSignature !== signature) {
      console.error('Razorpay webhook signature verification failed')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    const event = JSON.parse(body)

    // Handle the event
    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(event.payload.payment.entity)
        break

      case 'payment.failed':
        await handlePaymentFailed(event.payload.payment.entity)
        break

      case 'order.paid':
        await handleOrderPaid(event.payload.order.entity, event.payload.payment.entity)
        break

      default:
        console.log(`Unhandled Razorpay event type: ${event.event}`)
    }

    return NextResponse.json({ status: 'ok' })

  } catch (error) {
    console.error('Razorpay webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handlePaymentCaptured(payment: any) {
  try {
    // Find order by Razorpay order ID or payment ID
    const order = await db.order.findFirst({
      where: {
        OR: [
          { paymentId: payment.order_id },
          { orderNumber: payment.notes?.orderNumber }
        ]
      },
      include: {
        items: true
      }
    })

    if (!order) {
      console.error(`Order not found for payment ${payment.id}`)
      return
    }

    if (order.paymentStatus === 'PAID') {
      console.log(`Order ${order.orderNumber} already marked as paid`)
      return
    }

    // Update order status
    const updatedOrder = await db.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
        paymentId: payment.id
      }
    })

    // Update product stock
    for (const item of order.items) {
      await db.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity
          }
        }
      })
    }

    // Clear user's cart (only if user is logged in)
    if (order.userId) {
      await db.cartItem.deleteMany({
        where: {
          cart: {
            userId: order.userId
          }
        }
      })
    }

    console.log(`Razorpay payment captured for order ${order.orderNumber}`)

  } catch (error) {
    console.error('Error handling Razorpay payment capture:', error)
  }
}

async function handlePaymentFailed(payment: any) {
  try {
    const order = await db.order.findFirst({
      where: {
        OR: [
          { paymentId: payment.order_id },
          { orderNumber: payment.notes?.orderNumber }
        ]
      }
    })

    if (!order) {
      console.error(`Order not found for failed payment ${payment.id}`)
      return
    }

    await db.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'FAILED',
        status: 'CANCELLED'
      }
    })

    console.log(`Razorpay payment failed for order ${order.orderNumber}`)

  } catch (error) {
    console.error('Error handling Razorpay payment failure:', error)
  }
}

async function handleOrderPaid(order: any, payment: any) {
  try {
    // This is an additional handler for when an order is fully paid
    await handlePaymentCaptured(payment)
  } catch (error) {
    console.error('Error handling Razorpay order paid:', error)
  }
}