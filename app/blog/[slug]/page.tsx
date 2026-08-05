import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getBlogPostSeo, type BlogPostSeo } from '@/lib/server/seo'
import { BlogPostView } from './blog-post-view'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * Server wrapper for a blog post. The reading UI lives in the 'use client'
 * BlogPostView component; this server component adds the per-post SEO metadata
 * and BlogPosting JSON-LD that a client component can't export.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getBlogPostSeo(slug)

  if (!post) {
    return {
      title: 'Post not found',
      robots: { index: false, follow: true },
    }
  }

  const title = `${post.title} | Saakie by KNK`
  const description = post.excerpt.slice(0, 160)
  const url = `${SITE_URL}/blog/${post.slug}`
  const images = post.image ? [{ url: post.image }] : undefined

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      // 'article' rather than 'website' so shares render as an editorial card
      // and carry the publish date.
      type: 'article',
      title,
      description,
      url,
      siteName: 'Saakie by KNK',
      images,
      publishedTime: post.publishedAt.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: post.authorName ? [post.authorName] : undefined,
      section: post.category,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: post.image ? [post.image] : undefined,
    },
  }
}

function BlogPostJsonLd({ post }: { post: BlogPostSeo }) {
  const url = `${SITE_URL}/blog/${post.slug}`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: post.image ? [post.image] : undefined,
    articleSection: post.category,
    datePublished: post.publishedAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    // Posts without a byline are house-written, so the brand itself is the author.
    author: post.authorName
      ? { '@type': 'Person', name: post.authorName }
      : { '@type': 'Organization', name: 'Saakie by KNK', url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'Saakie by KNK',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/images/saakieLogo.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  }

  return (
    <script
      type="application/ld+json"
      // Escape `<` so a stray `</script>` in DB-sourced fields can't break out
      // of the script element.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
      }}
    />
  )
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  // getBlogPostSeo is cached, so this shares the query generateMetadata already ran.
  const post = await getBlogPostSeo(slug)
  if (!post) notFound()

  return (
    <>
      <BlogPostJsonLd post={post} />
      <BlogPostView />
    </>
  )
}
