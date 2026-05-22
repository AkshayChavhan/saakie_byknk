import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { Cart } from '@/components/cart'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

export const metadata: Metadata = {
  title: 'Shopping Cart | Saakie_byknk',
  description: 'Review your selected items and proceed to checkout',
}

export default async function CartPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/sign-in')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Cart />
      <Footer />
    </div>
  )
}