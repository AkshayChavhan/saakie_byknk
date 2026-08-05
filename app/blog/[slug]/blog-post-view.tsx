'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, ArrowRight, Calendar, Clock, PenLine } from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { renderMarkdown } from '@/lib/markdown'
import { formatDate } from '@/lib/utils'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

interface RelatedPost {
  id: string
  title: string
  slug: string
  excerpt: string
  category: string
  image: string | null
  authorName: string | null
  readMinutes: number
  isFeatured: boolean
  publishedAt: string | null
}

interface BlogPost extends RelatedPost {
  content: string
}

export function BlogPostView() {
  const params = useParams()
  const slug = params.slug as string

  const [post, setPost] = useState<BlogPost | null>(null)
  const [related, setRelated] = useState<RelatedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const fetchPost = useCallback(async () => {
    try {
      setLoading(true)
      setNotFound(false)

      const res = await fetchApi(`/api/blog/${slug}`)
      if (!res.ok) {
        setNotFound(true)
        return
      }

      const data = await res.json()
      setPost(data.post)
      setRelated(data.related || [])
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    fetchPost()
  }, [fetchPost])

  // Re-parsing the whole body on every render would be wasted work; the source
  // only changes when a different post loads.
  const bodyHtml = useMemo(() => (post ? renderMarkdown(post.content) : ''), [post])

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-3xl mx-auto animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-8" />
            <div className="h-6 bg-gray-200 rounded-full w-32 mb-6" />
            <div className="h-10 bg-gray-200 rounded w-full mb-3" />
            <div className="h-10 bg-gray-200 rounded w-2/3 mb-8" />
            <div className="h-64 md:h-96 bg-gray-200 rounded-3xl mb-10" />
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded" style={{ width: `${100 - i * 6}%` }} />
              ))}
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center px-4 py-24">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <PenLine className="w-8 h-8 text-rose-600" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              This story isn&apos;t here
            </h1>
            <p className="text-gray-600 mb-8">
              The post you are looking for may have been moved or is no longer published.
            </p>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl hover:from-red-700 hover:to-red-600 transition-all duration-200 font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to the blog
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <article className="py-10 md:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-rose-600 transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              All articles
            </Link>

            <span className="inline-block px-3 py-1 bg-rose-100 text-rose-600 text-xs font-semibold rounded-full mb-5">
              {post.category}
            </span>

            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-6">
              {post.title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-500 mb-10">
              {post.authorName && (
                <span className="flex items-center gap-1.5">
                  <PenLine className="w-4 h-4" />
                  {post.authorName}
                </span>
              )}
              {post.publishedAt && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {formatDate(post.publishedAt)}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {post.readMinutes} min read
              </span>
            </div>

            {post.image && (
              <div className="relative h-56 sm:h-80 md:h-[26rem] rounded-3xl overflow-hidden mb-10 md:mb-12">
                <Image
                  src={post.image}
                  alt={post.title}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 768px"
                  className="object-cover"
                />
              </div>
            )}

            {/* renderMarkdown HTML-escapes the source before it emits a single
                tag, so every element and attribute here is written by
                lib/markdown.ts rather than supplied by the author. */}
            <div
              className="text-base md:text-lg text-gray-700"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section className="py-16 md:py-20 bg-gray-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 md:mb-12">
                More from the blog
              </h2>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {related.map((item) => (
                  <Link
                    key={item.id}
                    href={`/blog/${item.slug}`}
                    className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100"
                  >
                    <div className="relative h-44 md:h-48 overflow-hidden bg-gray-100">
                      {item.image && (
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      )}
                    </div>
                    <div className="p-6">
                      <span className="inline-block px-3 py-1 bg-rose-100 text-rose-600 text-xs font-semibold rounded-full mb-4">
                        {item.category}
                      </span>
                      <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-rose-600 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{item.excerpt}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        {item.publishedAt ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(item.publishedAt)}
                          </span>
                        ) : (
                          <span />
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.readMinutes} min read
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="mt-10 md:mt-12 text-center">
                <Link
                  href="/blog"
                  className="group inline-flex items-center gap-2 text-rose-600 font-semibold hover:text-rose-700 transition-colors"
                >
                  Browse all articles
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  )
}
