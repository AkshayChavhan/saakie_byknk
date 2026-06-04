import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })

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
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}