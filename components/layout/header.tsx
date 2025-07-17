'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SignedIn, SignedOut, UserButton, useUser } from '@clerk/nextjs'
import { Menu, Search, ShoppingCart, Heart, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'New Arrivals', href: '/products?sort=newest' },
  { name: 'Silk Sarees', href: '/categories/silk-sarees' },
  { name: 'Cotton Sarees', href: '/categories/cotton-sarees' },
  { name: 'Designer', href: '/categories/designer' },
  { name: 'Sale', href: '/products?sale=true' },
]

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const pathname = usePathname()
  const { user } = useUser()
  const isAdmin = (user?.publicMetadata as any)?.role === 'ADMIN' || (user?.publicMetadata as any)?.role === 'SUPER_ADMIN'

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      {/* <div className="bg-red-600 text-white py-2 text-center text-sm">
        <p>Free shipping on orders above ₹2,999 | Cash on Delivery Available</p>
      </div> */}
      
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            
            <Link href="/" className="ml-4 lg:ml-0">
              <h1 className="text-2xl font-bold text-red-600">Saakie_byknk</h1>
            </Link>
          </div>

          <div className="hidden lg:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'text-sm font-medium transition-colors hover:text-red-600',
                  pathname === item.href ? 'text-red-600' : 'text-gray-700'
                )}
              >
                {item.name}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                className="text-sm font-medium text-gray-700 hover:text-red-600 transition-colors"
              >
                Admin
              </Link>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 rounded-md text-gray-700 hover:bg-gray-100"
            >
              <Search size={20} />
            </button>
            
            <SignedIn>
              <Link href="/wishlist" className="p-2 rounded-md text-gray-700 hover:bg-gray-100">
                <Heart size={20} />
              </Link>
              
              <Link href="/cart" className="p-2 rounded-md text-gray-700 hover:bg-gray-100 relative">
                <ShoppingCart size={20} />
                <span className="absolute -top-1 -right-1 bg-primary text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  0
                </span>
              </Link>
              
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            
            <SignedOut>
              <Link
                href="/sign-in"
                className="text-sm font-medium text-gray-700 hover:text-primary"
              >
                Sign In
              </Link>
            </SignedOut>
          </div>
        </div>

        {searchOpen && (
          <div className="py-4 border-t">
            <div className="relative">
              <input
                type="text"
                placeholder="Search for fashion, colors, styles..."
                className="w-full px-4 py-2 pr-12 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-primary">
                <Search size={20} />
              </button>
            </div>
          </div>
        )}

        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t">
            <div className="flex flex-col space-y-3">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'text-base font-medium py-2 px-4 rounded-md transition-colors',
                    pathname === item.href
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  {item.name}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base font-medium py-2 px-4 rounded-md text-gray-700 hover:bg-gray-100"
                >
                  Admin Dashboard
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}