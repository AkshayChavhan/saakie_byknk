import type { Metadata } from 'next'
import { auth } from '@/auth'
import { loadWishlistItems } from '@/lib/server/wishlist'
import { WishlistView } from './wishlist-view'

export const metadata: Metadata = {
  title: 'My Wishlist | Saakie_byknk',
  description: 'The sarees you have saved for later',
}

/**
 * Server wrapper for the wishlist. A signed-in visitor's items are loaded
 * here and rendered in the first HTML; a signed-out visitor gets the
 * sign-in prompt from the view without any request.
 */
export default async function WishlistPage() {
  const session = await auth()
  const items = session?.user
    ? JSON.parse(JSON.stringify(await loadWishlistItems(session.user.id)))
    : null

  return <WishlistView initialItems={items} />
}
