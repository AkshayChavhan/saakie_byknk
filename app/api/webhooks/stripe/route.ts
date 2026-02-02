import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function POST(request: NextRequest) {
  try {
    const headerPayload = await headers()
    const body = await request.text()

    // Forward the webhook request to the backend
    const response = await fetch(`${API_BASE_URL}/api/webhooks/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': headerPayload.get('stripe-signature') || '',
      },
      body,
    })

    const data = await response.json().catch(() => ({ received: true }))

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error forwarding stripe webhook:', error)
    return NextResponse.json(
      { error: 'Error forwarding webhook' },
      { status: 500 }
    )
  }
}
