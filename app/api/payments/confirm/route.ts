import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma as db } from '@/lib/db'
import { stripe, isStripeEnabled } from '@/lib/stripe'
import { razorpay, isRazorpayEnabled } from '@/lib/razorpay'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { gateway, paymentIntentId, razorpayPaymentId, razorpayOrderId, razorpaySignature, orderId } = body

    if (!gateway || !orderId) {
      return NextResponse.json(
        { error: 'Gateway and order ID are required' },
        { status: 400 }
      )
    }

    // Find user by clerkId
    const user = await db.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Find the order
    const order = await db.order.findFirst({
      where: {
        id: orderId,
        userId: user.id
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.paymentStatus === 'PAID') {
      return NextResponse.json({ error: 'Order already paid' }, { status: 400 })
    }

    let paymentVerified = false

    if (gateway === 'stripe') {
      if (!paymentIntentId) {
        return NextResponse.json(
          { error: 'Payment intent ID is required for Stripe' },
          { status: 400 }
        )
      }

      // Check if Stripe is enabled
      if (!isStripeEnabled() || !stripe) {
        return NextResponse.json(
          { error: 'Stripe payment is not available' },
          { status: 503 }
        )
      }

      try {
        // Retrieve payment intent from Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
        
        if (paymentIntent.status === 'succeeded' && paymentIntent.metadata.orderId === orderId) {
          paymentVerified = true
        }
      } catch (error) {
        console.error('Error verifying Stripe payment:', error)
        return NextResponse.json(
          { error: 'Payment verification failed' },
          { status: 400 }
        )
      }

    } else if (gateway === 'razorpay') {
      if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
        return NextResponse.json(
          { error: 'Razorpay payment details are incomplete' },
          { status: 400 }
        )
      }

      // Check if Razorpay is enabled
      if (!isRazorpayEnabled() || !razorpay) {
        return NextResponse.json(
          { error: 'Razorpay payment is not available' },
          { status: 503 }
        )
      }

      try {
        // Verify Razorpay signature
        const body = razorpayOrderId + '|' + razorpayPaymentId
        const expectedSignature = crypto
          .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
          .update(body.toString())
          .digest('hex')

        if (expectedSignature === razorpaySignature) {
          // Additionally verify the payment status from Razorpay
          const payment = await razorpay.payments.fetch(razorpayPaymentId)
          if (payment.status === 'captured' || payment.status === 'authorized') {
            paymentVerified = true
          }
        }
      } catch (error) {
        console.error('Error verifying Razorpay payment:', error)
        return NextResponse.json(
          { error: 'Payment verification failed' },
          { status: 400 }
        )
      }
    }

    if (!paymentVerified) {
      return NextResponse.json(
        { error: 'Payment verification failed' },
        { status: 400 }
      )
    }

    // Update order status to PAID and CONFIRMED
    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
        paymentId: gateway === 'stripe' ? paymentIntentId : razorpayPaymentId
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        user: true,
        shippingAddress: true
      }
    })

    // Update product stock
    for (const item of updatedOrder.items) {
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
          userId: user.id
        }
      }
    })

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: 'Payment confirmed successfully'
    })

  } catch (error) {
    console.error('Error confirming payment:', error)
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    )
  }
}