import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { Cart } from '@/components/cart'
import { Header } from '@/components/layout/header'
import { loadCart } from '@/lib/server/cart'

export const metadata: Metadata = {
  title: 'Shopping Cart | Saakie_byknk',
  description: 'Review your selected items and proceed to checkout',
}

export default async function CartPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/sign-in')
  }

  // The session is already known here, so load the cart too: the client
  // used to wait for Clerk, then the profile, then this same request.
  const cart = JSON.parse(JSON.stringify(await loadCart(session.user.id)))

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Cart initialCart={cart} />
    </div>
  )
}