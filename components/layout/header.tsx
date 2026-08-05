'use client'

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { Search, Heart, User, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchApi } from '@/lib/api'
import { CartIcon } from '@/components/cart'

/** A category as GET /api/categories/nav returns it, already pruned of
 *  anything whose subtree holds no active product. */
interface NavCategory {
  id: string
  name: string
  slug: string
  children: Array<{ id: string; name: string; slug: string }>
}

/** A plain link, or the slot the Categories dropdown occupies. */
type NavItem =
  | { kind: 'link'; name: string; href: string }
  | { kind: 'categories'; name: string }

const navigation: NavItem[] = [
  { kind: 'link', name: 'Home', href: '/' },
  { kind: 'link', name: 'New Arrivals', href: '/products?sort=newest' },
  // Took over the slot the flat "All Products" link held; the unfiltered
  // listing is still reachable from the foot of the dropdown.
  { kind: 'categories', name: 'Categories' },
  { kind: 'link', name: 'Sale', href: '/products?sale=true' },
  { kind: 'link', name: 'Posts', href: '/post' },
]

/**
 * The single nav link to highlight for the current URL, or null for none.
 *
 * `usePathname()` drops the query string, so the links that differ from each
 * other only by query — "Sale" (`?sale=true`) and "New Arrivals"
 * (`?sort=newest`) — could never be told apart by path alone.
 *
 * A link qualifies when its path matches and every query param it pins is
 * present with that value. Where several links share a path, the most specific
 * one wins, so `?sale=true` highlights Sale rather than a bare `/products`
 * link. The Categories dropdown has no single href and is highlighted
 * separately, by path prefix.
 */
function useActiveNavHref() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return useMemo(() => {
    let active: string | null = null
    let bestSpecificity = -1

    for (const item of navigation) {
      if (item.kind !== 'link') continue
      const [path, query = ''] = item.href.split('?')
      if (path !== pathname) continue

      const pinned: Array<[string, string]> = []
      new URLSearchParams(query).forEach((value, key) => pinned.push([key, value]))
      if (pinned.some(([key, value]) => searchParams.get(key) !== value)) continue

      if (pinned.length > bestSpecificity) {
        active = item.href
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

/**
 * The dropdown's contents: every category, with its sub-categories nested
 * beneath it. Both levels link to the same `/categories/[slug]` page, which
 * scopes its listing to the whole subtree — so a parent shows its children's
 * stock rather than reading empty.
 */
function CategoryMenuList({
  categories,
  variant,
  onNavigate,
}: {
  categories: NavCategory[]
  variant: NavVariant
  onNavigate?: () => void
}) {
  const isDrawer = variant === 'drawer'

  return (
    <div className="flex flex-col">
      {categories.map((category) => (
        <div key={category.id}>
          <Link
            href={`/categories/${category.slug}`}
            onClick={onNavigate}
            className={cn(
              'block rounded-lg text-sm font-medium text-gray-200 hover:bg-gray-800 hover:text-white transition-colors',
              isDrawer ? 'px-4 py-2.5' : 'px-3 py-2'
            )}
          >
            {category.name}
          </Link>
          {/* Rendered only when there is something to nest — a category with
              no stocked sub-categories stays a plain link. */}
          {category.children.length > 0 && (
            <div className={cn('flex flex-col border-l border-gray-800', isDrawer ? 'ml-5 pl-2' : 'ml-4 pl-2')}>
              {category.children.map((child) => (
                <Link
                  key={child.id}
                  href={`/categories/${child.slug}`}
                  onClick={onNavigate}
                  className={cn(
                    'block rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors',
                    isDrawer ? 'px-4 py-2' : 'px-3 py-1.5'
                  )}
                >
                  {child.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
      <Link
        href="/products"
        onClick={onNavigate}
        className={cn(
          'mt-1 border-t border-gray-800 pt-2 text-sm text-gray-400 hover:text-white transition-colors',
          isDrawer ? 'px-4 py-2.5' : 'px-3 py-2'
        )}
      >
        All Products
      </Link>
    </div>
  )
}

interface CategoriesNavItemProps {
  name: string
  variant: NavVariant
  isActive: boolean
  categories: NavCategory[]
  isOpen: boolean
  onToggle: () => void
  onNavigate?: () => void
  staggerClass?: string
}

/**
 * The "Categories" entry. Desktop anchors its panel to the trigger and the
 * drawer expands in place; the mobile row only renders the trigger, because
 * its strip is `overflow-x-auto` and would clip an anchored panel — the header
 * draws that one underneath the strip instead.
 */
function CategoriesNavItem({
  name,
  variant,
  isActive,
  categories,
  isOpen,
  onToggle,
  onNavigate,
  staggerClass,
}: CategoriesNavItemProps) {
  const trigger = (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-haspopup="true"
      className={cn(
        navLinkClass(variant, isActive),
        'inline-flex items-center gap-1',
        variant === 'drawer' && 'w-full justify-between text-left',
        variant !== 'drawer' && staggerClass
      )}
    >
      {name}
      <ChevronDown size={14} className={cn('transition-transform duration-200', isOpen && 'rotate-180')} />
    </button>
  )

  if (variant === 'mobileRow') return trigger

  if (variant === 'drawer') {
    return (
      <div className={cn('flex flex-col', staggerClass)} data-category-menu>
        {trigger}
        {/* Expands by transitioning the grid row track from 0fr to 1fr — the
            one way to animate to a content-driven height without measuring it.
            The list stays mounted so collapsing glides shut the same way it
            opened; `inert` keeps the hidden links out of the tab order. */}
        <div
          className={cn(
            'grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none',
            isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          )}
          inert={!isOpen}
        >
          <div className="overflow-hidden">
            <div className="mt-1 mb-1">
              <CategoryMenuList categories={categories} variant="drawer" onNavigate={onNavigate} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative" data-category-menu>
      {trigger}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-3 max-h-[70vh] w-64 overflow-y-auto rounded-xl border border-gray-800 bg-gray-900 p-2 shadow-2xl">
          <CategoryMenuList categories={categories} variant="desktop" onNavigate={onNavigate} />
        </div>
      )}
    </div>
  )
}

interface NavLinksProps {
  variant: NavVariant
  activeHref: string | null
  categoriesActive: boolean
  categories: NavCategory[]
  openMenu: NavVariant | null
  onToggleMenu: (variant: NavVariant) => void
  onNavigate?: () => void
  isClosing?: boolean
}

/** Presentational half — no hooks, so it doubles as the Suspense fallback. */
function NavLinks({
  variant,
  activeHref,
  categoriesActive,
  categories,
  openMenu,
  onToggleMenu,
  onNavigate,
  isClosing,
}: NavLinksProps) {
  return (
    <>
      {navigation.map((item, index) => {
        const staggerClass =
          variant === 'drawer'
            ? isClosing
              ? `menu-item-exit menu-stagger-exit-${index + 1}`
              : `menu-item-enter menu-stagger-${index + 1}`
            : undefined

        if (item.kind === 'categories') {
          // Nothing to drop down into — the entry is left out entirely rather
          // than opening onto an empty panel.
          if (categories.length === 0) return null
          return (
            <CategoriesNavItem
              key={item.name}
              name={item.name}
              variant={variant}
              isActive={categoriesActive}
              categories={categories}
              isOpen={openMenu === variant}
              onToggle={() => onToggleMenu(variant)}
              onNavigate={onNavigate}
              staggerClass={staggerClass}
            />
          )
        }

        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onNavigate}
            className={cn(navLinkClass(variant, activeHref === item.href), staggerClass)}
          >
            {item.name}
          </Link>
        )
      })}
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
  // Which variant's Categories dropdown is open, if any. One at a time: the
  // desktop bar and the mobile strip are never on screen together, and the
  // drawer sits above both.
  const [openMenu, setOpenMenu] = useState<NavVariant | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status } = useSession()
  const isSignedIn = status === 'authenticated'
  const role = session?.user?.role
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'
  const menuRef = useRef<HTMLDivElement>(null)

  // The header mounts per page rather than in the root layout, so this rides
  // on the React Query cache to stay a single request for the whole session
  // instead of one per navigation.
  const { data: categoryTree = [] } = useQuery<NavCategory[]>({
    queryKey: ['category-nav'],
    queryFn: async () => {
      const response = await fetchApi('/api/categories/nav')
      if (!response.ok) throw new Error('Failed to load categories')
      return response.json()
    },
    staleTime: 5 * 60 * 1000,
  })

  // Categories has no href of its own, so the whole section lights it up.
  const categoriesActive = pathname === '/categories' || pathname.startsWith('/categories/')

  const toggleCategoryMenu = useCallback((variant: NavVariant) => {
    setOpenMenu((current) => (current === variant ? null : variant))
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
      if (e.key !== 'Escape') return
      if (openMenu) setOpenMenu(null)
      else if (mobileMenuOpen) handleCloseMenu()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [mobileMenuOpen, handleCloseMenu, openMenu])

  // Dismiss the Categories dropdown on a click outside it. The trigger and its
  // panel are both marked `data-category-menu`, so a press inside either is
  // left to their own handlers.
  useEffect(() => {
    if (!openMenu) return
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null
      if (target?.closest('[data-category-menu]')) return
      setOpenMenu(null)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [openMenu])

  // A link inside the dropdown navigates without unmounting the header, so the
  // panel has to be closed off the route change rather than the click.
  useEffect(() => {
    setOpenMenu(null)
  }, [pathname])

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
            <SuspendedNavLinks
              variant="desktop"
              categoriesActive={categoriesActive}
              categories={categoryTree}
              openMenu={openMenu}
              onToggleMenu={toggleCategoryMenu}
            />
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
        <div className="lg:hidden -mx-4 sm:-mx-6 border-t border-gray-800" data-category-menu>
          <div className="flex items-center gap-1 overflow-x-auto px-4 sm:px-6 py-2 scrollbar-hide">
            <SuspendedNavLinks
              variant="mobileRow"
              categoriesActive={categoriesActive}
              categories={categoryTree}
              openMenu={openMenu}
              onToggleMenu={toggleCategoryMenu}
            />
            {isAdmin && (
              <Link
                href="/admin"
                className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                Admin
              </Link>
            )}
          </div>
          {/* Drawn outside the scrolling strip above, which would otherwise
              clip a panel anchored to the chip. */}
          {openMenu === 'mobileRow' && categoryTree.length > 0 && (
            <div className="max-h-[60vh] overflow-y-auto border-t border-gray-800 bg-gray-900 px-2 py-2 sm:px-4">
              <CategoryMenuList
                categories={categoryTree}
                variant="mobileRow"
                onNavigate={() => setOpenMenu(null)}
              />
            </div>
          )}
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

          {/* Slide-in Menu Panel — a flex column so the logo bar and the
              copyright stay put while only the link list scrolls. Scrolling the
              panel itself would drag the `absolute` footer up over the links,
              which is what happens the moment Categories is expanded. */}
          <div
            ref={menuRef}
            className={cn(
              "lg:hidden fixed top-0 left-0 z-50 flex h-full w-[280px] sm:w-[320px] flex-col bg-gray-900 shadow-2xl",
              isClosing ? "sidebar-slide-out" : "sidebar-slide-in"
            )}
          >
            {/* Menu Header — black bar so the logo's dark background blends in
                seamlessly, matching the main top header. */}
            <div className="flex shrink-0 items-center justify-between gap-3 p-4 bg-black border-b border-gray-800">
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

            {/* Navigation Links — the only scrolling region, so an expanded
                Categories list runs long without displacing anything else. */}
            <nav className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-col space-y-1">
                <SuspendedNavLinks
                  variant="drawer"
                  categoriesActive={categoriesActive}
                  categories={categoryTree}
                  openMenu={openMenu}
                  onToggleMenu={toggleCategoryMenu}
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
            <div className="shrink-0 p-4 border-t border-gray-800 bg-gray-900">
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