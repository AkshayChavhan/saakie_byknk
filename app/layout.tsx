import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })

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
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  )
}