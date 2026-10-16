import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { loadCart } from '@/lib/server/cart'
import { getStoreSettings } from '@/lib/server/settings'
import { CheckoutView } from './checkout-view'

export const metadata: Metadata = {
  title: 'Checkout | Saakie_byknk',
  description: 'Confirm your delivery address and pay',
}

/**
 * Server wrapper for checkout. The session is known here, so the cart, the
 * address book and the shipping switch are loaded together and handed to
 * the form; the client used to wait for Clerk, then the profile, then
 * these three requests before showing anything.
 */
export default async function CheckoutPage() {
  const session = await auth()
  if (!session?.user) redirect('/sign-in?callbackUrl=/checkout')

  const [cart, addresses, settings] = await Promise.all([
    loadCart(session.user.id),
    prisma.address.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isDefault: 'desc' }],
    }),
    // A settings failure must not block checkout — fall back to charging.
    getStoreSettings().catch(() => ({ shippingEnabled: true })),
  ])

  const initial = JSON.parse(
    JSON.stringify({ items: cart.items, addresses, shippingEnabled: settings.shippingEnabled !== false })
  )

  return <CheckoutView initial={initial} />
}
