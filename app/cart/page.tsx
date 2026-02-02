import { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Cart } from '@/components/cart'

export const metadata: Metadata = {
  title: 'Shopping Cart | Saakie_byknk',
  description: 'Review your selected items and proceed to checkout',
}

export default async function CartPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Cart />
    </div>
  )
}