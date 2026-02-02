'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Star, TrendingUp, Tag, Sparkles } from 'lucide-react'
import { API_BASE_URL } from '@/lib/api'

interface HeroSlide {
  id: string
  type: string
  title: string
  subtitle: string
  description: string
  image: string
  link: string
  cta: string
  badge: string | null
  discount: number | null
  product: {
    name: string
    price: number
    comparePrice: number | null
    category: string
  } | null
}

export function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [slides, setSlides] = useState<HeroSlide[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch dynamic slides
  useEffect(() => {
    const fetchSlides = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/hero-slides`)
        if (response.ok) {
          const data = await response.json()
          setSlides(data.slides || data)
        }
      } catch (error) {
        console.error('Failed to fetch hero slides:', error)
        // Fallback to default slides
        setSlides([
          {
            id: 'default',
            type: 'default',
            title: 'Premium Sarees',
            subtitle: 'Handcrafted Excellence',
            description: 'Discover our beautiful collection',
            image: '/images/hero-1.jpg',
            link: '/products',
            cta: 'Shop Now',
            badge: null,
            discount: null,
            product: null
          }
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchSlides()
  }, [])

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

  if (loading) {
    return (
      <section className="relative h-[400px] sm:h-[500px] lg:h-[600px] overflow-hidden bg-gray-200 animate-pulse">
        <div className="h-full flex items-center justify-center">
          <div className="text-gray-400">Loading...</div>
        </div>
      </section>
    )
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

  return (
    <section className="relative h-[400px] sm:h-[500px] lg:h-[600px] overflow-hidden">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Background Image */}
          <div className="absolute inset-0">
            <Image
              src={slide.image}
              alt={slide.title}
              fill
              className="object-cover"
              priority={index === 0}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>
          
          <div className="relative z-10 h-full flex items-center">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-2xl text-white">
                {/* Badge */}
                {slide.badge && (
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-white mb-4 ${getBadgeColor(slide.type)}`}>
                    {getBadgeIcon(slide.type)}
                    {slide.badge}
                  </div>
                )}

                {/* Subtitle with discount */}
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm sm:text-base uppercase tracking-wider animate-slide-up">
                    {slide.subtitle}
                  </p>
                  {slide.discount && (
                    <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                      -{slide.discount}%
                    </span>
                  )}
                </div>

                {/* Title */}
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 animate-slide-up animation-delay-100">
                  {slide.title}
                </h2>

                {/* Description */}
                <p className="text-base sm:text-lg lg:text-xl mb-6 animate-slide-up animation-delay-200">
                  {slide.description}
                </p>

                {/* Product Info */}
                {slide.product && (
                  <div className="mb-6 animate-slide-up animation-delay-250">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 inline-block">
                      <p className="text-sm text-white/80 mb-1">{slide.product.category}</p>
                      <p className="font-semibold text-lg">{slide.product.name}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xl font-bold">₹{slide.product.price.toLocaleString()}</span>
                        {slide.product.comparePrice && (
                          <span className="text-sm text-white/60 line-through">
                            ₹{slide.product.comparePrice.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* CTA Button */}
                <Link
                  href={slide.link}
                  className="inline-block bg-white text-gray-900 px-6 sm:px-8 py-3 sm:py-4 rounded-md font-semibold hover:bg-gray-100 transition-all duration-300 animate-slide-up animation-delay-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  {slide.cta}
                </Link>
              </div>
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors"
        aria-label="Previous slide"
      >
        <ChevronLeft size={24} />
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors"
        aria-label="Next slide"
      >
        <ChevronRight size={24} />
      </button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all ${
              index === currentSlide
                ? 'bg-white w-8 sm:w-10'
                : 'bg-white/50 hover:bg-white/70'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  )
}