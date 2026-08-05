import type { Metadata } from 'next'
import { BlogView } from './blog-view'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

const title = 'The Saree Chronicles | Saakie by KNK'
const description =
  'Stories on the heritage, craft, and modern styling of the saree — draping guides, weave histories, and fashion notes from Saakie by KNK.'
const url = `${SITE_URL}/blog`
const ogImage = `${SITE_URL}/images/og-image.jpg`

/**
 * Server wrapper for the blog index. The listing is fetched client-side by
 * BlogView, so the metadata here is static — it describes the section itself
 * rather than any individual post.
 */
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  openGraph: {
    type: 'website',
    title,
    description,
    url,
    siteName: 'Saakie by KNK',
    images: [{ url: ogImage }],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: [ogImage],
  },
}

export default function BlogPage() {
  return <BlogView />
}
