import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function POST(req: Request) {
  try {
    const headerPayload = await headers()
    const body = await req.text()

    // Forward the webhook request to the backend
    const response = await fetch(`${API_BASE_URL}/api/webhooks/clerk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'svix-id': headerPayload.get('svix-id') || '',
        'svix-timestamp': headerPayload.get('svix-timestamp') || '',
        'svix-signature': headerPayload.get('svix-signature') || '',
      },
      body,
    })

    const data = await response.text()

    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    })
  } catch (error) {
    console.error('Error forwarding clerk webhook:', error)
    return new NextResponse('Error forwarding webhook', { status: 500 })
  }
}
