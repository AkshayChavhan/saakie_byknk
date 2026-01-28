'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { SignedIn, SignedOut, UserButton, useUser } from '@clerk/nextjs'
import { Search, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CartIcon } from '@/components/cart'

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'New Arrivals', href: '/products?sort=newest' },
  { name: 'Silk Sarees', href: '/categories/silk-sarees' },
  { name: 'Cotton Sarees', href: '/categories/cotton-sarees' },
  { name: 'Designer', href: '/categories/designer' },
  { name: 'Sale', href: '/products?sale=true' },
  { name: 'Posts', href: '/post' },
]

// Animated Hamburger Component
function HamburgerIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <div className={cn("flex flex-col justify-center items-center w-6 h-6 gap-1.5", isOpen && "hamburger-open")}>
      <span className="hamburger-line" />
      <span className="hamburger-line" />
      <span className="hamburger-line" />
    </div>
  )
}

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const pathname = usePathname()
  const { user } = useUser()
  // For now, show admin link for all authenticated users
  // Role check is handled by middleware
  const isAdmin = !!user
  const [isScrolled, setIsScrolled] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Handle menu close with animation
  const handleCloseMenu = useCallback(() => {
    setIsClosing(true)
    // Wait for exit animation to complete
    setTimeout(() => {
      setMobileMenuOpen(false)
      setIsClosing(false)
    }, 300)
  }, [])

  // Toggle menu
  const toggleMenu = () => {
    if (mobileMenuOpen) {
      handleCloseMenu()
    } else {
      setMobileMenuOpen(true)
    }
  }

  // Close menu when pressing Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        handleCloseMenu()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [mobileMenuOpen, handleCloseMenu])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      {/* <div className="bg-red-600 text-white py-2 text-center text-sm">
        <p>Free shipping on orders above ₹2,999 | Cash on Delivery Available</p>
      </div> */}
      
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            {/* Mobile: Animated hamburger menu button */}
            <button
              onClick={toggleMenu}
              className="lg:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {isScrolled && !mobileMenuOpen ? (
                <Image
                  src="/images/saakie.jpg"
                  alt="Saakie by KNK"
                  width={100}
                  height={32}
                  className="h-6 w-auto"
                />
              ) : (
                <HamburgerIcon isOpen={mobileMenuOpen || isClosing} />
              )}
            </button>

            {/* Desktop: Always show logo. Mobile: Only show when not scrolled */}
            <Link
              href="/"
              className={cn(
                "ml-4 lg:ml-0 flex items-center transition-opacity duration-300",
                isScrolled ? "lg:opacity-100 opacity-0 pointer-events-none lg:pointer-events-auto" : "opacity-100"
              )}
            >
              <Image
                src="/images/saakie.jpg"
                alt="Saakie by KNK"
                width={150}
                height={50}
                className="h-8 w-auto sm:h-10 lg:h-12"
                priority
              />
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
              <>
                <Link
                  href="/admin"
                  className="text-sm font-medium text-gray-700 hover:text-red-600 transition-colors"
                >
                  Admin
                </Link>
              </>
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
              
              <CartIcon />
              
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

      </nav>

      {/* Mobile Menu Overlay & Sidebar */}
      {mobileMenuOpen && (
        <>
          {/* Dark Overlay - Click to close */}
          <div
            className={cn(
              "lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm",
              isClosing ? "animate-fade-out" : "animate-fade-in"
            )}
            onClick={handleCloseMenu}
            aria-hidden="true"
          />

          {/* Slide-in Menu Panel */}
          <div
            ref={menuRef}
            className={cn(
              "lg:hidden fixed top-0 left-0 z-50 h-full w-[280px] sm:w-[320px] bg-gray-900 shadow-2xl overflow-y-auto",
              isClosing ? "sidebar-slide-out" : "sidebar-slide-in"
            )}
          >
            {/* Menu Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <Link href="/" onClick={handleCloseMenu}>
                <Image
                  src="/images/saakie.jpg"
                  alt="Saakie by KNK"
                  width={120}
                  height={40}
                  className="h-8 w-auto brightness-0 invert"
                />
              </Link>
              <button
                onClick={handleCloseMenu}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                aria-label="Close menu"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="p-4">
              <div className="flex flex-col space-y-1">
                {navigation.map((item, index) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={handleCloseMenu}
                    className={cn(
                      'text-base font-medium py-3 px-4 rounded-xl transition-all duration-200',
                      pathname === item.href
                        ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white',
                      isClosing
                        ? `menu-item-exit menu-stagger-exit-${index + 1}`
                        : `menu-item-enter menu-stagger-${index + 1}`
                    )}
                  >
                    {item.name}
                  </Link>
                ))}
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={handleCloseMenu}
                    className={cn(
                      "text-base font-medium py-3 px-4 rounded-xl text-gray-300 hover:bg-gray-800 hover:text-white transition-all duration-200",
                      isClosing
                        ? `menu-item-exit menu-stagger-exit-${navigation.length + 1}`
                        : `menu-item-enter menu-stagger-${navigation.length + 1}`
                    )}
                  >
                    Admin Dashboard
                  </Link>
                )}
              </div>

              {/* Divider */}
              <div className="my-6 border-t border-gray-800" />

              {/* Additional Links */}
              <div className="flex flex-col space-y-1">
                <Link
                  href="/about"
                  onClick={handleCloseMenu}
                  className={cn(
                    "text-sm font-medium py-2.5 px-4 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-all duration-200",
                    isClosing ? "menu-item-exit menu-stagger-exit-7" : "menu-item-enter menu-stagger-7"
                  )}
                >
                  About Us
                </Link>
                <Link
                  href="/our-story"
                  onClick={handleCloseMenu}
                  className={cn(
                    "text-sm font-medium py-2.5 px-4 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-all duration-200",
                    isClosing ? "menu-item-exit menu-stagger-exit-8" : "menu-item-enter menu-stagger-8"
                  )}
                >
                  Our Story
                </Link>
                <Link
                  href="/blog"
                  onClick={handleCloseMenu}
                  className={cn(
                    "text-sm font-medium py-2.5 px-4 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-all duration-200",
                    isClosing ? "menu-item-exit menu-stagger-exit-8" : "menu-item-enter menu-stagger-8"
                  )}
                >
                  Blog
                </Link>
              </div>
            </nav>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800 bg-gray-900">
              <p className="text-xs text-gray-500 text-center">
                © 2024 Saakie_byknk. All rights reserved.
              </p>
            </div>
          </div>
        </>
      )}
    </header>
  )
}