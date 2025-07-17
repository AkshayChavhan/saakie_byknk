'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const slides = [
  {
    id: 1,
    title: 'Exquisite Silk Sarees',
    subtitle: 'Handwoven with Love',
    description: 'Discover our premium collection of pure silk sarees',
    image: '/images/hero-1.jpg',
    link: '/categories/silk-sarees',
    cta: 'Shop Silk Collection',
  },
  {
    id: 2,
    title: 'Designer Collection 2024',
    subtitle: 'Modern Meets Traditional',
    description: 'Exclusive designer sarees for the contemporary woman',
    image: '/images/hero-2.jpg',
    link: '/categories/designer',
    cta: 'Explore Designer Range',
  },
  {
    id: 3,
    title: 'Festival Special',
    subtitle: 'Up to 40% Off',
    description: 'Celebrate in style with our festive collection',
    image: '/images/hero-3.jpg',
    link: '/products?sale=true',
    cta: 'Shop Sale',
  },
]

export function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
  }

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
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
          <div className="relative h-full w-full bg-gradient-to-r from-black/50 to-black/20">
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
            
            <div className="relative z-10 h-full flex items-center">
              <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl text-white">
                  <p className="text-sm sm:text-base uppercase tracking-wider mb-2 animate-slide-up">
                    {slide.subtitle}
                  </p>
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 animate-slide-up animation-delay-100">
                    {slide.title}
                  </h2>
                  <p className="text-base sm:text-lg lg:text-xl mb-8 animate-slide-up animation-delay-200">
                    {slide.description}
                  </p>
                  <Link
                    href={slide.link}
                    className="inline-block bg-white text-gray-900 px-6 sm:px-8 py-3 sm:py-4 rounded-md font-semibold hover:bg-gray-100 transition-colors animate-slide-up animation-delay-300"
                  >
                    {slide.cta}
                  </Link>
                </div>
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