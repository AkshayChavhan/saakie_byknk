// Instagram Basic Display API Integration
// Documentation: https://developers.facebook.com/docs/instagram-basic-display-api

export interface InstagramMedia {
  id: string
  caption?: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_url: string
  thumbnail_url?: string // Only for VIDEO type
  permalink: string
  timestamp: string
  username: string
}

export interface InstagramUser {
  id: string
  username: string
  account_type: string
  media_count: number
}

export interface InstagramResponse {
  data: InstagramMedia[]
  paging?: {
    cursors: {
      before: string
      after: string
    }
    next?: string
  }
}

const INSTAGRAM_API_URL = 'https://graph.instagram.com'

/**
 * Fetches Instagram media from the Basic Display API
 * @param accessToken - Long-lived access token from Instagram
 * @param limit - Number of posts to fetch (default: 12)
 */
export async function fetchInstagramMedia(
  accessToken: string,
  limit: number = 12
): Promise<InstagramMedia[]> {
  try {
    const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,username'
    const url = `${INSTAGRAM_API_URL}/me/media?fields=${fields}&limit=${limit}&access_token=${accessToken}`

    const response = await fetch(url, {
      next: { revalidate: 3600 } // Cache for 1 hour
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Instagram API Error:', error)
      throw new Error(error.error?.message || 'Failed to fetch Instagram media')
    }

    const data: InstagramResponse = await response.json()
    return data.data
  } catch (error) {
    console.error('Error fetching Instagram media:', error)
    throw error
  }
}

/**
 * Fetches Instagram user profile
 * @param accessToken - Long-lived access token from Instagram
 */
export async function fetchInstagramUser(
  accessToken: string
): Promise<InstagramUser> {
  try {
    const fields = 'id,username,account_type,media_count'
    const url = `${INSTAGRAM_API_URL}/me?fields=${fields}&access_token=${accessToken}`

    const response = await fetch(url, {
      next: { revalidate: 3600 } // Cache for 1 hour
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Instagram API Error:', error)
      throw new Error(error.error?.message || 'Failed to fetch Instagram user')
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching Instagram user:', error)
    throw error
  }
}

/**
 * Refreshes a long-lived access token
 * Long-lived tokens are valid for 60 days and can be refreshed
 * @param accessToken - Current long-lived access token
 */
export async function refreshInstagramToken(
  accessToken: string
): Promise<{ access_token: string; token_type: string; expires_in: number }> {
  try {
    const url = `${INSTAGRAM_API_URL}/refresh_access_token?grant_type=ig_refresh_token&access_token=${accessToken}`

    const response = await fetch(url)

    if (!response.ok) {
      const error = await response.json()
      console.error('Instagram Token Refresh Error:', error)
      throw new Error(error.error?.message || 'Failed to refresh token')
    }

    return await response.json()
  } catch (error) {
    console.error('Error refreshing Instagram token:', error)
    throw error
  }
}

/**
 * Format relative time from timestamp
 */
export function formatInstagramDate(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
