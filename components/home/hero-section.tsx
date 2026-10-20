'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Star, TrendingUp, Tag, Sparkles } from 'lucide-react'
import type { HeroSlide } from '@/lib/server/storefront'

export type { HeroSlide }

const DEFAULT_SLIDES: HeroSlide[] = [
  {
    id: 'default',
    type: 'default',
    title: 'Premium Sarees',
    subtitle: 'Handcrafted Excellence',
    description: 'Discover our beautiful collection',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1920&h=1080&fit=crop',
    link: '/products',
    cta: 'Shop Now',
    badge: null,
    discount: null,
    product: null,
  },
]

interface HeroSectionProps {
  /** Slides loaded on the server (app/page.tsx). Empty falls back to a default slide. */
  slides: HeroSlide[]
}

/**
 * Homepage carousel. The slides arrive as props from the server-rendered
 * page, so the first slide's image is in the initial HTML and `priority`
 * actually preloads it; this component only owns the carousel state.
 */
export function HeroSection({ slides: incoming }: HeroSectionProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const slides = incoming.length > 0 ? incoming : DEFAULT_SLIDES

  // Auto-slide functionality
  useEffect(() => {
    if (slides.length === 0) return
    
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 6000) // Increased to 6 seconds for better readability
    return () => clearInterval(timer)
  }, [slides.length])

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
  }

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }

  const getBadgeIcon = (type: string) => {
    switch (type) {
      case 'bestseller': return <TrendingUp className="h-4 w-4" />
      case 'sale': return <Tag className="h-4 w-4" />
      case 'featured': return <Sparkles className="h-4 w-4" />
      default: return <Star className="h-4 w-4" />
    }
  }

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'bestseller': return 'bg-green-500'
      case 'sale': return 'bg-red-500'
      case 'featured': return 'bg-purple-500'
      default: return 'bg-blue-500'
    }
  }

  if (slides.length === 0) {
    return (
      <section className="relative h-[400px] sm:h-[500px] lg:h-[600px] overflow-hidden bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Welcome to Saakie_byknk</h2>
          <p className="mb-8">Discover our beautiful collection</p>
          <Link href="/products" className="bg-white text-gray-900 px-8 py-4 rounded-md font-semibold">
            Shop Now
          </Link>
        </div>
      </section>
    )
  }

  // Every slide used to mount its full-viewport image at once, so all of
  // them downloaded on page load and competed with the first (the LCP
  // image). Only the visible slide and the one after it carry an image now;
  // the rest stay in the DOM without one until the carousel reaches them.
  const nextIndex = (currentSlide + 1) % slides.length
  const shouldRenderImage = (index: number) =>
    index === currentSlide || index === nextIndex

  return (
    <section className="relative h-[400px] sm:h-[500px] lg:h-[600px] overflow-hidden">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide
              ? 'opacity-100'
              : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Background Image */}
          <div className="absolute inset-0 bg-gray-900">
            {shouldRenderImage(index) && (
              <Image
                src={slide.image}
                alt={slide.title}
                fill
                sizes="100vw"
                className="object-cover"
                // Preload only the first slide while it is the one on screen;
                // the upcoming slide is fetched lazily, never ahead of it.
                priority={index === 0 && currentSlide === 0}
                loading={index === currentSlide ? undefined : 'lazy'}
              />
            )}
          </div>
          
          {/*
            On mobile the content is confined to the bottom half (top-1/2) so it always
            sits *below* the vertically-centred prev/next arrows and never overlaps them.
            From `sm` up it goes back to filling the slide and being vertically centred.
          */}
          <div className="absolute inset-x-0 bottom-0 top-1/2 sm:top-0 z-10 flex items-end sm:items-center">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-12 sm:pb-0">
              <div className="max-w-2xl text-white">
                {/*
                  Everything but the title is optional. An admin slide with a
                  blank subtitle, description or button renders without that
                  element rather than showing placeholder copy.
                */}

                {/* Badge + subtitle share one row on mobile to save vertical space */}
                {(slide.badge || slide.subtitle || slide.discount) && (
                  <div className="flex flex-wrap items-center gap-2 mb-1 sm:block sm:mb-0">
                    {slide.badge && (
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-white sm:mb-4 ${getBadgeColor(slide.type)}`}>
                        {getBadgeIcon(slide.type)}
                        {slide.badge}
                      </div>
                    )}

                    {/* Subtitle with discount */}
                    {(slide.subtitle || slide.discount) && (
                      <div className="flex items-center gap-2 sm:mb-2">
                        {slide.subtitle && (
                          <p className="text-xs sm:text-base uppercase tracking-wider animate-slide-up">
                            {slide.subtitle}
                          </p>
                        )}
                        {slide.discount && (
                          <span className="bg-red-500 text-white px-2 py-0.5 sm:py-1 rounded text-xs font-bold">
                            -{slide.discount}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Title */}
                <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold mb-1 sm:mb-4 line-clamp-2 animate-slide-up animation-delay-100">
                  {slide.title}
                </h2>

                {/* Description */}
                {slide.description && (
                  <p className="text-sm sm:text-lg lg:text-xl mb-3 sm:mb-6 line-clamp-2 sm:line-clamp-none animate-slide-up animation-delay-200">
                    {slide.description}
                  </p>
                )}

                {/* Details + CTA — on mobile: details bottom-left, button bottom-right */}
                {(slide.product || slide.cta) && (
                  <div className="flex items-end gap-3 sm:block">
                  {/* Product Info */}
                  {slide.product && (
                    <div className="min-w-0 flex-1 sm:flex-none sm:mb-6 animate-slide-up animation-delay-250">
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 sm:p-4 inline-block max-w-full">
                        <p className="text-xs sm:text-sm text-white/80 mb-0.5 sm:mb-1">{slide.product.category}</p>
                        <p className="font-semibold text-sm sm:text-lg line-clamp-1">{slide.product.name}</p>
                        <div className="flex items-center gap-2 mt-1 sm:mt-2">
                          <span className="text-base sm:text-xl font-bold">₹{slide.product.price.toLocaleString()}</span>
                          {slide.product.comparePrice && (
                            <span className="text-xs sm:text-sm text-white/60 line-through">
                              ₹{slide.product.comparePrice.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CTA Button — only when the slide has a label */}
                  {slide.cta && (
                    <Link
                      href={slide.link ?? '/products'}
                      className="shrink-0 ml-auto sm:ml-0 inline-block bg-white text-gray-900 px-5 sm:px-8 py-2.5 sm:py-4 rounded-md text-sm sm:text-base font-semibold hover:bg-gray-100 transition-all duration-300 animate-slide-up animation-delay-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                      {slide.cta}
                    </Link>
                  )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={prevSlide}
        className="absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 z-30 p-1.5 sm:p-2 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 z-30 p-1.5 sm:p-2 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors"
        aria-label="Next slide"
      >
        <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>

      {/*
        Progress dots: small squares, the current slide stretched into a bar.
        Bottom-right, offset left of the fixed chat bubble (bottom-6 right-6,
        ~56px wide) so the two never overlap when the hero fills the viewport.
      */}
      <div className="absolute bottom-6 right-24 sm:bottom-8 sm:right-28 z-30 flex items-center gap-2.5 sm:gap-3">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-1.5 sm:h-2 rounded-[1px] transition-all duration-500 ease-out ${
              index === currentSlide
                ? 'w-10 sm:w-14 bg-white/90'
                : 'w-1.5 sm:w-2 bg-white/50 hover:bg-white/75'
            }`}
            aria-label={`Go to slide ${index + 1}`}
            aria-current={index === currentSlide ? 'true' : undefined}
          />
        ))}
      </div>
    </section>
  )
}