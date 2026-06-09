import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { Suspense } from 'react'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'
import { Providers } from '@/components/providers'
import { NavigationProgress } from '@/components/ui/navigation-progress'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

// Editorial serif used for headings — gives the storefront its premium,
// saree-boutique feel. Exposed as a CSS variable so any component can opt in
// via the `font-serif` utility (wired up in tailwind.config.js).
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

export const metadata: Metadata = {
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
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className={inter.className}>
        {/* Top-of-page navigation progress bar. Suspense is required because it
            reads useSearchParams; without it Next would opt the whole tree into
            client rendering. */}
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <Providers>{children}</Providers>
        {/* Vercel Analytics (page views) + Speed Insights (Web Vitals).
            No-ops outside Vercel; no keys or cookie banner required. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}