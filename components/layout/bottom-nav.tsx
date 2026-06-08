'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Home, ShoppingBag, Heart, ShoppingCart, User } from 'lucide-react'
import { cn } from '@/lib/utils'

// App-like bottom tab bar. Rendered globally (mounted in Providers) but only
// shown on small screens when the site is launched as an installed PWA
// (display-mode: standalone) — see the `standalone:` variants below. On a normal
// mobile browser tab the existing header navigation is used instead, so we don't
// double up. The body gets matching bottom padding via globals.css.
const tabs = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Shop', href: '/products', icon: ShoppingBag },
  { name: 'Wishlist', href: '/wishlist', icon: Heart },
  { name: 'Cart', href: '/cart', icon: ShoppingCart },
]

export function BottomNav() {
  const pathname = usePathname()
  const { status } = useSession()
  const accountHref = status === 'authenticated' ? '/wishlist' : '/sign-in'

  const items = [...tabs, { name: 'Account', href: accountHref, icon: User }]

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}?`)

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 hidden border-t border-gray-200 bg-white pb-safe standalone:block sm:standalone:hidden"
    >
      <ul className="flex items-stretch justify-around">
        {items.map(({ name, href, icon: Icon }) => {
          const active = isActive(href)
          return (
            <li key={name} className="flex-1">
              <Link
                href={href}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
                  active ? 'text-rose-600' : 'text-gray-500 hover:text-gray-900'
                )}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
                {name}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
