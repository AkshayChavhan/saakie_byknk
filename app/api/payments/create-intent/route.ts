import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma as db } from '@/lib/db'
import { stripe, formatAmountForStripe, isStripeEnabled } from '@/lib/stripe'
import { razorpay, formatAmountForRazorpay, isRazorpayEnabled } from '@/lib/razorpay'
import { validateCart } from '@/lib/cart'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { paymentGateway, shippingAddressId, billingAddressId } = await request.json()

    if (!paymentGateway || !['stripe', 'razorpay'].includes(paymentGateway)) {
      return NextResponse.json(
        { error: 'Invalid payment gateway' },
        { status: 400 }
      )
    }

    if (!shippingAddressId) {
      return NextResponse.json(
        { error: 'Shipping address is required' },
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

    // Validate cart
    const cartValidation = await validateCart(user.id)
    if (!cartValidation.isValid) {
      return NextResponse.json(
        { error: 'Cart validation failed', details: cartValidation.errors },
        { status: 400 }
      )
    }

    // Get cart with items
    const cart = await db.cart.findUnique({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true
              }
            }
          }
        }
      }
    })

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    // Verify addresses exist and belong to user
    const shippingAddress = await db.address.findFirst({
      where: {
        id: shippingAddressId,
        userId: user.id
      }
    })

    if (!shippingAddress) {
      return NextResponse.json(
        { error: 'Invalid shipping address' },
        { status: 400 }
      )
    }

    let billingAddress = shippingAddress
    if (billingAddressId && billingAddressId !== shippingAddressId) {
      const billAddr = await db.address.findFirst({
        where: {
          id: billingAddressId,
          userId: user.id
        }
      })
      if (!billAddr) {
        return NextResponse.json(
          { error: 'Invalid billing address' },
          { status: 400 }
        )
      }
      billingAddress = billAddr
    }

    // Calculate totals
    const subtotal = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0)
    const shipping = subtotal > 2999 ? 0 : 99
    const tax = Math.round(subtotal * 0.18) // 18% GST
    const total = subtotal + shipping + tax

    // Generate unique order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    // Create order with PENDING status
    const order = await db.order.create({
      data: {
        orderNumber,
        userId: user.id,
        items: {
          create: cart.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity
          }))
        },
        shippingAddressId: shippingAddress.id,
        billingAddressId: billingAddress.id,
        subtotal,
        tax,
        shipping,
        total,
        paymentMethod: paymentGateway.toUpperCase(),
        paymentStatus: 'PENDING',
        status: 'PENDING'
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        shippingAddress: true,
        billingAddress: true
      }
    })

    let paymentIntent

    if (paymentGateway === 'stripe') {
      // Check if Stripe is enabled
      if (!isStripeEnabled() || !stripe) {
        return NextResponse.json(
          { error: 'Stripe payment is not available. Please use another payment method.' },
          { status: 503 }
        )
      }

      // Create Stripe payment intent
      paymentIntent = await stripe.paymentIntents.create({
        amount: formatAmountForStripe(total),
        currency: 'inr',
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          userId: user.id
        },
        description: `Order ${order.orderNumber}`,
        receipt_email: user.email
      })

      // Update order with payment intent ID
      await db.order.update({
        where: { id: order.id },
        data: { paymentId: paymentIntent.id }
      })

      return NextResponse.json({
        success: true,
        order,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        gateway: 'stripe'
      })

    } else if (paymentGateway === 'razorpay') {
      // Check if Razorpay is enabled
      if (!isRazorpayEnabled() || !razorpay) {
        return NextResponse.json(
          { error: 'Razorpay payment is not available. Please use another payment method.' },
          { status: 503 }
        )
      }

      // Create Razorpay order
      const razorpayOrder = await razorpay.orders.create({
        amount: formatAmountForRazorpay(total),
        currency: 'INR',
        receipt: order.orderNumber,
        notes: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          userId: user.id
        }
      })

      // Update order with Razorpay order ID
      await db.order.update({
        where: { id: order.id },
        data: { paymentId: razorpayOrder.id }
      })

      return NextResponse.json({
        success: true,
        order,
        razorpayOrderId: razorpayOrder.id,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        gateway: 'razorpay'
      })
    }

  } catch (error) {
    console.error('Error creating payment intent:', error)
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}