import type { Metadata, Viewport } from 'next'
import { Public_Sans, Playfair_Display } from 'next/font/google'
import { Suspense } from 'react'
import { ClerkProvider } from '@clerk/nextjs'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'
import { Providers } from '@/components/providers'
import { NavigationProgress } from '@/components/ui/navigation-progress'
import { Footer } from '@/components/layout/footer'
import { SiteFooter } from '@/components/layout/site-footer'

// Body typeface. Amazon sets its own stack in Amazon Ember, which is
// proprietary to Amazon and cannot be licensed for this site — their own
// fallback is plain Arial. Public Sans is the closest free match: humanist
// like Ember, with the same large x-height and open apertures, and a variable
// axis that covers the 200/400/500/700 weights Amazon actually loads.
//
// Exposed only as a CSS variable. `font-sans` in tailwind.config.js points at
// it, and `body` picks it up via @apply in globals.css, so the stack is
// declared in exactly one place.
const publicSans = Public_Sans({
  subsets: ['latin'],
  variable: '--font-public-sans',
  display: 'swap',
})

// Editorial serif used for headings — gives the storefront its premium,
// saree-boutique feel. Exposed as a CSS variable so any component can opt in
// via the `font-serif` utility (wired up in tailwind.config.js).
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

export const metadata: Metadata = {
  // Resolves relative OG/canonical URLs (product/category pages set their own).
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: 'Saakie_byknk - Premium Fashion Online',
  description: 'Shop the finest collection of premium fashion online. Premium quality, authentic designs, and fast delivery across India.',
  keywords: 'fashion, online fashion shopping, designer fashion, premium clothing, style, trends',
  applicationName: 'Saakie_byknk',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Saakie',
  },
  formatDetection: { telephone: false },
  openGraph: {
    title: 'Saakie_byknk - Premium Fashion Online',
    description: 'Shop the finest collection of premium fashion online',
    url: 'https://saakie-byknk.com',
    siteName: 'Saakie_byknk',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
}

// Next 15 moves themeColor / viewport settings out of `metadata` into a separate
// `viewport` export. viewportFit:'cover' lets content paint into the iOS notch /
// home-indicator area, which the .pt-safe / .pb-safe utilities then pad around.
// userScalable / maximumScale are intentionally omitted so pinch-zoom stays
// enabled for accessibility.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#161616',
  colorScheme: 'light',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${publicSans.variable} ${playfair.variable}`}>
      <body>
        {/* Top-of-page navigation progress bar. Suspense is required because it
            reads useSearchParams; without it Next would opt the whole tree into
            client rendering. */}
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {/* Clerk session for the whole tree. The app's own code reads it
            through lib/auth-client.ts (client) and auth.ts (server) only. */}
        <ClerkProvider
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          afterSignOutUrl="/"
          appearance={{ variables: { colorPrimary: '#e11d48' } }}
        >
          <Providers>
            {children}
            {/* One footer for the whole app, shown only on the routes
                SiteFooter lists. Pages no longer render their own. */}
            <SiteFooter>
              <Footer />
            </SiteFooter>
          </Providers>
        </ClerkProvider>
        {/* Vercel Analytics (page views) + Speed Insights (Web Vitals).
            No-ops outside Vercel; no keys or cookie banner required. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}