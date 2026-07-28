'use client'

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Search, Heart, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CartIcon } from '@/components/cart'

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'New Arrivals', href: '/products?sort=newest' },
  { name: 'All Products', href: '/products' },
  { name: 'Sale', href: '/products?sale=true' },
  { name: 'Posts', href: '/post' },
]

/**
 * The single nav link to highlight for the current URL, or null for none.
 *
 * `usePathname()` drops the query string, so comparing it to `item.href`
 * directly marks "All Products" (`/products`) active on every /products URL
 * while the links that differ only by query — "Sale" (`?sale=true`) and
 * "New Arrivals" (`?sort=newest`) — can never match at all.
 *
 * A link qualifies when its path matches and every query param it pins is
 * present with that value. Where several links share a path, the most specific
 * one wins, so `?sale=true` highlights Sale rather than All Products, while a
 * bare `/products` (or one carrying only unrelated params like `?page=2`)
 * falls back to All Products.
 */
function useActiveNavHref() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return useMemo(() => {
    let active: string | null = null
    let bestSpecificity = -1

    for (const { href } of navigation) {
      const [path, query = ''] = href.split('?')
      if (path !== pathname) continue

      const pinned: Array<[string, string]> = []
      new URLSearchParams(query).forEach((value, key) => pinned.push([key, value]))
      if (pinned.some(([key, value]) => searchParams.get(key) !== value)) continue

      if (pinned.length > bestSpecificity) {
        active = href
        bestSpecificity = pinned.length
      }
    }

    return active
  }, [pathname, searchParams])
}

type NavVariant = 'desktop' | 'mobileRow' | 'drawer'

const navLinkClass = (variant: NavVariant, isActive: boolean) => {
  switch (variant) {
    case 'desktop':
      return cn(
        'text-sm font-medium transition-colors hover:text-gray-300',
        isActive ? 'text-white font-semibold' : 'text-gray-200'
      )
    case 'mobileRow':
      return cn(
        'whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
        isActive
          ? 'bg-white/15 text-white'
          : 'text-gray-300 hover:text-white hover:bg-white/10'
      )
    case 'drawer':
      return cn(
        'text-base font-medium py-3 px-4 rounded-xl transition-all duration-200',
        isActive
          ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
      )
  }
}

interface NavLinksProps {
  variant: NavVariant
  activeHref: string | null
  onNavigate?: () => void
  isClosing?: boolean
}

/** Presentational half — no hooks, so it doubles as the Suspense fallback. */
function NavLinks({ variant, activeHref, onNavigate, isClosing }: NavLinksProps) {
  return (
    <>
      {navigation.map((item, index) => (
        <Link
          key={item.name}
          href={item.href}
          onClick={onNavigate}
          className={cn(
            navLinkClass(variant, activeHref === item.href),
            variant === 'drawer' &&
              (isClosing
                ? `menu-item-exit menu-stagger-exit-${index + 1}`
                : `menu-item-enter menu-stagger-${index + 1}`)
          )}
        >
          {item.name}
        </Link>
      ))}
    </>
  )
}

/**
 * Reads the query string, so every use must sit under a Suspense boundary —
 * otherwise `useSearchParams` opts each statically-rendered page that shows the
 * header into client rendering (see the same pattern in app/layout.tsx).
 */
function ActiveNavLinks(props: Omit<NavLinksProps, 'activeHref'>) {
  return <NavLinks {...props} activeHref={useActiveNavHref()} />
}

/** Links render immediately; only the highlight waits on the query string. */
function SuspendedNavLinks(props: Omit<NavLinksProps, 'activeHref'>) {
  return (
    <Suspense fallback={<NavLinks {...props} activeHref={null} />}>
      <ActiveNavLinks {...props} />
    </Suspense>
  )
}

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
  const [searchQuery, setSearchQuery] = useState('')
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status } = useSession()
  const isSignedIn = status === 'authenticated'
  const role = session?.user?.role
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'
  const menuRef = useRef<HTMLDivElement>(null)

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

  // Submit the header search — navigates to the products page filtered by query.
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const query = searchQuery.trim()
    if (!query) return
    router.push(`/products?search=${encodeURIComponent(query)}`)
    setSearchOpen(false)
    setSearchQuery('')
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
    <header className="sticky top-0 z-50 bg-black shadow-sm pt-safe">
      {/* <div className="bg-red-600 text-white py-2 text-center text-sm">
        <p>Free shipping on orders above ₹2,999 | Cash on Delivery Available</p>
      </div> */}
      
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center flex-1 min-w-0">
            {/* Mobile: Animated hamburger menu button — always visible so the
                side menu stays openable at any scroll position. */}
            <button
              onClick={toggleMenu}
              className="lg:hidden p-2 rounded-md text-white hover:bg-gray-800 transition-colors"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              <HamburgerIcon isOpen={mobileMenuOpen || isClosing} />
            </button>

            {/* Logo is always visible (mobile + desktop), beside the hamburger.
                It spans up to the full header width; height stays capped to the
                bar — a touch larger on mobile than desktop. */}
            <Link
              href="/"
              className="ml-4 lg:ml-0 flex items-center flex-1 min-w-0 max-w-full"
            >
              <Image
                src="/images/saakieLogo.png"
                alt="Saakie by KNK"
                width={150}
                height={50}
                className="w-full h-auto max-h-14 lg:max-h-12 object-contain object-left"
                priority
              />
            </Link>
          </div>

          <div className="hidden lg:flex items-center space-x-8">
            <SuspendedNavLinks variant="desktop" />
            {isAdmin && (
              <>
                <Link
                  href="/admin"
                  className="text-sm font-medium text-gray-200 hover:text-gray-300 transition-colors"
                >
                  Admin
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 rounded-md text-white hover:bg-gray-800"
            >
              <Search size={20} />
            </button>
            
            {isSignedIn ? (
              <>
                <Link href="/wishlist" className="p-2 rounded-md text-white hover:bg-gray-800">
                  <Heart size={20} />
                </Link>

                <CartIcon />

                {/* Account goes straight to the account page (profile, orders,
                    sign out). Wishlist has its own heart icon above, so it is
                    intentionally NOT duplicated here. */}
                <Link
                  href="/account"
                  aria-label="Account"
                  className={cn(
                    'p-2 rounded-full transition-colors',
                    pathname === '/account'
                      ? 'bg-white text-gray-900'
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                  )}
                >
                  <User size={20} />
                </Link>
              </>
            ) : (
              <Link
                href="/sign-in"
                className="text-sm font-medium text-white hover:text-gray-300"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>

        {/* Mobile: horizontally-scrollable nav row. The logo takes the full
            width of the top bar on mobile, so the links live on a second row
            here (and remain available in the hamburger menu too). Always
            visible — it stays put as the page scrolls. */}
        <div className="lg:hidden -mx-4 sm:-mx-6 border-t border-gray-800">
          <div className="flex items-center gap-1 overflow-x-auto px-4 sm:px-6 py-2 scrollbar-hide">
            <SuspendedNavLinks variant="mobileRow" />
            {isAdmin && (
              <Link
                href="/admin"
                className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                Admin
              </Link>
            )}
          </div>
        </div>

        {searchOpen && (
          <div className="py-4 border-t">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for fashion, colors, styles..."
                className="w-full px-4 py-2 pr-12 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
              <button
                type="submit"
                aria-label="Search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-primary"
              >
                <Search size={20} />
              </button>
            </form>
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
            {/* Menu Header — black bar so the logo's dark background blends in
                seamlessly, matching the main top header. */}
            <div className="flex items-center justify-between gap-3 p-4 bg-black border-b border-gray-800">
              {/* Logo grows to fill the row; the close button keeps its size. */}
              <Link
                href="/"
                onClick={handleCloseMenu}
                className="flex flex-1 min-w-0 items-center"
              >
                <Image
                src="/images/saakieLogo.png"
                alt="Saakie by KNK"
                width={240}
                height={50}
                className="w-full h-auto max-h-28 object-contain object-left"
                priority
              />
              </Link>
              <button
                onClick={handleCloseMenu}
                className="shrink-0 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
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
                <SuspendedNavLinks
                  variant="drawer"
                  onNavigate={handleCloseMenu}
                  isClosing={isClosing}
                />
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