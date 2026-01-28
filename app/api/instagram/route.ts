import { NextResponse } from 'next/server'
import { fetchInstagramMedia, fetchInstagramUser } from '@/lib/instagram'

export async function GET(request: Request) {
  try {
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN

    if (!accessToken) {
      return NextResponse.json(
        {
          error: 'Instagram access token not configured',
          setup_required: true,
          instructions: 'Please follow the setup guide to configure Instagram integration'
        },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '12')

    // Fetch both user info and media in parallel
    const [user, media] = await Promise.all([
      fetchInstagramUser(accessToken),
      fetchInstagramMedia(accessToken, limit)
    ])

    return NextResponse.json({
      user,
      media,
      cached_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Instagram API Error:', error)

    // Check if it's a token error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    if (errorMessage.includes('token') || errorMessage.includes('expired')) {
      return NextResponse.json(
        {
          error: 'Instagram token expired or invalid',
          token_error: true,
          message: 'Please refresh your Instagram access token'
        },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch Instagram data', message: errorMessage },
      { status: 500 }
    )
  }
}
