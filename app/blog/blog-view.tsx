'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import Image from 'next/image'
import Link from 'next/link'
import { Clock, Calendar, ArrowRight, BookOpen, Sparkles, TrendingUp, Heart, Leaf, Globe } from 'lucide-react'
import { fetchApi } from '@/lib/api'

// Mirrors the select on GET /api/blog — the list route deliberately omits
// `content` so the index never ships every article's Markdown to the browser.
interface BlogPostSummary {
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

const PLACEHOLDER_IMAGE = '/images/placeholder-product.svg'

const colorClasses = {
  rose: { badge: 'bg-rose-100 text-rose-600', hover: 'group-hover:bg-rose-50' },
  purple: { badge: 'bg-purple-100 text-purple-600', hover: 'group-hover:bg-purple-50' },
  orange: { badge: 'bg-orange-100 text-orange-600', hover: 'group-hover:bg-orange-50' },
  pink: { badge: 'bg-pink-100 text-pink-600', hover: 'group-hover:bg-pink-50' },
} as const

type PaletteKey = keyof typeof colorClasses

const PALETTE_KEYS = Object.keys(colorClasses) as PaletteKey[]

/**
 * Posts are free-text categorised and carry no colour of their own, so pick one
 * from the category name. A sum-of-char-codes hash is plenty: it only has to be
 * stable, so "Fashion Guide" always wears the same badge everywhere it appears.
 */
function categoryPalette(category: string) {
  let hash = 0
  for (let i = 0; i < category.length; i++) {
    hash = (hash * 31 + category.charCodeAt(i)) % 100003
  }
  return colorClasses[PALETTE_KEYS[hash % PALETTE_KEYS.length]]
}

// publishedAt arrives as an ISO string (or null for a post published without a
// date). en-US long form is what the page has always shown — "January 25, 2024".
function formatDate(iso: string | null): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

const sareeImportance = [
  {
    icon: Clock,
    title: 'A Legacy of 5,000 Years',
    description: 'The saree is one of the oldest forms of garments in human civilization, with references dating back to the Indus Valley Civilization around 2800-1800 BCE.',
    gradient: 'from-rose-500 to-pink-500',
    bg: 'bg-gradient-to-br from-rose-50 to-pink-50',
  },
  {
    icon: Globe,
    title: 'Symbol of Cultural Identity',
    description: 'Each region of India has developed its own unique saree traditions - Kanjeevaram, Banarasi, Paithani, Bandhani - each telling a unique story.',
    gradient: 'from-purple-500 to-indigo-500',
    bg: 'bg-gradient-to-br from-purple-50 to-indigo-50',
  },
  {
    icon: Sparkles,
    title: 'Unmatched Versatility',
    description: 'No other garment offers the versatility of a saree with over 80 different draping styles, each suited for different occasions and body types.',
    gradient: 'from-blue-500 to-cyan-500',
    bg: 'bg-gradient-to-br from-blue-50 to-cyan-50',
  },
  {
    icon: Heart,
    title: 'Empowerment Through Elegance',
    description: 'Throughout history, the saree has draped the shoulders of powerful women - from queens to freedom fighters, from homemakers to CEOs.',
    gradient: 'from-green-500 to-emerald-500',
    bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
  },
  {
    icon: Leaf,
    title: 'Sustainable Fashion Choice',
    description: 'Handwoven sarees made from natural fibers are biodegradable and support traditional weaving communities, making them eco-conscious choices.',
    gradient: 'from-amber-500 to-yellow-500',
    bg: 'bg-gradient-to-br from-amber-50 to-yellow-50',
  },
  {
    icon: TrendingUp,
    title: 'Timeless Yet Contemporary',
    description: 'The saree has successfully bridged tradition and modernity with innovative designs, unconventional draping, and fusion elements.',
    gradient: 'from-rose-500 to-red-500',
    bg: 'bg-gradient-to-br from-rose-50 to-red-50',
  },
]

export function BlogView() {
  const [posts, setPosts] = useState<BlogPostSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const response = await fetchApi('/api/blog')
        if (!response.ok) throw new Error('Failed to load blog posts')
        const data = await response.json()
        if (!cancelled) setPosts(Array.isArray(data) ? data : [])
      } catch {
        // The surrounding page is static marketing copy and still worth showing,
        // so a failed fetch degrades to the same empty state as "no posts yet".
        if (!cancelled) setPosts([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  // The API already sorts newest-first, so posts[0] is the natural fallback when
  // nothing is explicitly flagged as featured.
  const featured = posts.find((post) => post.isFeatured) ?? posts[0] ?? null
  const gridPosts = featured ? posts.filter((post) => post.id !== featured.id) : posts
  const featuredDate = featured ? formatDate(featured.publishedAt) : null
  const featuredPalette = featured ? categoryPalette(featured.category) : null

  // "No blogs uploaded" belongs to a genuinely empty blog. With a single post
  // that post is already on screen as the featured article, so the grid below
  // is dropped entirely rather than contradicting it.
  const showEmptyState = !loading && posts.length === 0
  const showGrid = loading || gridPosts.length > 0

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-[70vh] md:min-h-[60vh] flex items-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1920&h=1080&fit=crop"
            alt="Saree Heritage"
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
        </div>

        {/* Floating elements */}
        <div className="absolute top-20 right-10 md:right-20 animate-float">
          <BookOpen className="w-10 h-10 md:w-14 md:h-14 text-rose-300/50" />
        </div>
        <div className="absolute bottom-32 left-10 md:left-20 animate-float animation-delay-500">
          <Sparkles className="w-8 h-8 md:w-12 md:h-12 text-orange-300/50" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-20">
          <div className="max-w-3xl">
            <div className="animate-slide-up">
              <span className="inline-block px-4 py-2 bg-rose-500/20 backdrop-blur-sm rounded-full text-rose-300 font-medium text-sm mb-6 border border-rose-500/30">
                Our Blog
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 animate-slide-up animation-delay-100">
              The Saree{' '}
              <span className="text-rose-400">Chronicles</span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-gray-300 font-light max-w-2xl mb-8 animate-slide-up animation-delay-200">
              Explore the rich heritage, timeless elegance, and modern interpretations of India&apos;s most beloved garment
            </p>
            <div className="animate-slide-up animation-delay-300">
              <a
                href="#articles"
                className="group inline-flex items-center px-6 py-3 bg-white/10 backdrop-blur-sm text-white font-medium rounded-full border border-white/30 hover:bg-white/20 transition-all"
              >
                Explore Articles
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce-soft">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-3 bg-white/50 rounded-full animate-slide-up" />
          </div>
        </div>
      </section>

      {/* Featured Article */}
      {featured && (
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
                {/* Image */}
                <div className="relative animate-slide-left">
                  <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl">
                    <Image
                      src={featured.image || PLACEHOLDER_IMAGE}
                      alt={featured.title}
                      fill
                      // Half the row on lg (grid lg:grid-cols-2), full below.
                      sizes="(min-width: 1024px) 50vw, 100vw"
                      className="object-cover hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="px-4 py-2 bg-rose-500 text-white text-sm font-medium rounded-full">
                        Featured
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="animate-slide-right">
                  <span className={`inline-block px-4 py-2 ${featuredPalette?.badge} rounded-full font-medium text-sm mb-4`}>
                    {featured.category}
                  </span>
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                    {featured.title}
                  </h2>
                  <p className="text-lg text-gray-600 leading-relaxed mb-6">
                    {featured.excerpt}
                  </p>
                  <div className="flex items-center gap-6 text-sm text-gray-500 mb-8">
                    {featuredDate && (
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {featuredDate}
                      </span>
                    )}
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {featured.readMinutes} min read
                    </span>
                  </div>
                  <Link
                    href={`/blog/${featured.slug}`}
                    className="group inline-flex items-center px-6 py-3 bg-rose-600 text-white font-medium rounded-full hover:bg-rose-700 transition-all hover:shadow-lg"
                  >
                    Read Full Article
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Saree Importance Section */}
      <section id="saree-importance" className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12 md:mb-16">
              <span className="inline-block px-4 py-2 bg-purple-100 rounded-full text-purple-600 font-medium text-sm mb-4">
                Deep Dive
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Why Sarees Matter
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Understanding the cultural, historical, and modern significance of this timeless garment
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {sareeImportance.map((item, index) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.title}
                    className={`${item.bg} rounded-3xl p-6 md:p-8 hover-lift animate-slide-up`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className={`w-14 h-14 bg-gradient-to-br ${item.gradient} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">{item.title}</h3>
                    <p className="text-gray-600 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Blog Posts Grid. Dropped entirely when the only post there is has
          already been shown above as the featured article — a "From Our Blog"
          heading over nothing reads as a bug. */}
      {(showGrid || showEmptyState) && (
      <section id="articles" className="py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12 md:mb-16">
              <span className="inline-block px-4 py-2 bg-orange-100 rounded-full text-orange-600 font-medium text-sm mb-4">
                Latest Articles
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900">
                From Our Blog
              </h2>
            </div>

            {/* The hero and heritage sections are static copy, so only this
                section waits on the API rather than blanking the whole page. */}
            {loading ? (
              <div className="py-16 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-600 border-t-transparent mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading blog posts...</p>
                </div>
              </div>
            ) : showEmptyState ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <BookOpen className="w-8 h-8 text-rose-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No blogs uploaded</h3>
                <p className="text-gray-600">
                  There are no published articles yet. Check back soon.
                </p>
              </div>
            ) : (
              /* Mobile Scroll / Desktop Grid */
              <div className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-visible">
                {gridPosts.map((post, index) => {
                  const palette = categoryPalette(post.category)
                  const date = formatDate(post.publishedAt)

                  return (
                    <Link
                      key={post.id}
                      href={`/blog/${post.slug}`}
                      className="group flex-shrink-0 w-[80vw] sm:w-[60vw] md:w-full snap-center bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 animate-slide-up border border-gray-100"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <article>
                        <div className="relative h-48 md:h-52 overflow-hidden">
                          <Image
                            src={post.image || PLACEHOLDER_IMAGE}
                            alt={post.title}
                            fill
                            // Swipe carousel below md (w-[80vw] sm:w-[60vw]),
                            // then a md:grid-cols-2 lg:grid-cols-4 grid.
                            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, (min-width: 640px) 60vw, 80vw"
                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className={`p-6 ${palette.hover} transition-colors`}>
                          <span className={`inline-block px-3 py-1 ${palette.badge} text-xs font-semibold rounded-full mb-4`}>
                            {post.category}
                          </span>
                          <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-rose-600 transition-colors">
                            {post.title}
                          </h3>
                          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                            {post.excerpt}
                          </p>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            {date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {date}
                              </span>
                            )}
                            <span className="flex items-center gap-1 ml-auto">
                              <Clock className="w-3 h-3" />
                              {post.readMinutes} min read
                            </span>
                          </div>
                        </div>
                      </article>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </section>
      )}

      {/* Newsletter CTA */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-rose-600 via-pink-600 to-orange-500 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-40 h-40 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-60 h-60 bg-white rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
              Explore Our Collection
            </h2>
            <p className="text-lg md:text-xl text-white/90 mb-10">
              Discover the perfect saree that tells your story. From traditional handlooms to contemporary designs, find your next favorite at Saakie.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/products"
                className="group inline-flex items-center justify-center px-8 py-4 bg-white text-rose-600 font-semibold rounded-full hover:bg-gray-100 transition-all hover:shadow-xl"
              >
                Shop Now
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/categories"
                className="inline-flex items-center justify-center px-8 py-4 bg-transparent text-white font-semibold rounded-full border-2 border-white/50 hover:bg-white/10 transition-all"
              >
                Browse Categories
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
