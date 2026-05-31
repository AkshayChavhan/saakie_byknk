import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}