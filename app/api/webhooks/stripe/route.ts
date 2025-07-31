import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { prisma as db } from '@/lib/db'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = (await headers()).get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    let event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object
        await handlePaymentSuccess(paymentIntent)
        break

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object
        await handlePaymentFailure(failedPayment)
        break

      case 'payment_intent.canceled':
        const canceledPayment = event.data.object
        await handlePaymentCancellation(canceledPayment)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Stripe webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handlePaymentSuccess(paymentIntent: any) {
  try {
    const orderId = paymentIntent.metadata.orderId

    if (!orderId) {
      console.error('No order ID in payment intent metadata')
      return
    }

    // Update order status
    const order = await db.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
        paymentId: paymentIntent.id
      },
      include: {
        items: true,
        user: true
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

    // Clear user's cart
    await db.cartItem.deleteMany({
      where: {
        cart: {
          userId: order.userId
        }
      }
    })

    console.log(`Payment succeeded for order ${order.orderNumber}`)

  } catch (error) {
    console.error('Error handling payment success:', error)
  }
}

async function handlePaymentFailure(paymentIntent: any) {
  try {
    const orderId = paymentIntent.metadata.orderId

    if (!orderId) {
      console.error('No order ID in payment intent metadata')
      return
    }

    await db.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'FAILED',
        status: 'CANCELLED'
      }
    })

    console.log(`Payment failed for order ${orderId}`)

  } catch (error) {
    console.error('Error handling payment failure:', error)
  }
}

async function handlePaymentCancellation(paymentIntent: any) {
  try {
    const orderId = paymentIntent.metadata.orderId

    if (!orderId) {
      console.error('No order ID in payment intent metadata')
      return
    }

    await db.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'CANCELLED',
        status: 'CANCELLED'
      }
    })

    console.log(`Payment cancelled for order ${orderId}`)

  } catch (error) {
    console.error('Error handling payment cancellation:', error)
  }
}