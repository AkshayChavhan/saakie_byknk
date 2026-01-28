'use client'

import { Building2, Ruler, Heart, Target, Eye, Award, Users, Palette, Sparkles, Star, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

const founders = [
  {
    name: 'Krutika',
    role: 'Urban Architect',
    image: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400&h=400&fit=crop&crop=face',
    icon: Building2,
    color: 'rose',
    quote: 'Fashion is architecture for the body — it should be both functional and beautiful.',
    description: 'With a keen eye for urban aesthetics and spatial design, Krutika brings architectural sensibility to fashion.',
  },
  {
    name: 'Neha',
    role: 'Civil Engineer',
    image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop&crop=face',
    icon: Ruler,
    color: 'orange',
    quote: 'Engineering taught me that the best creations balance beauty with strength.',
    description: 'Neha\'s engineering background ensures that every design is not just beautiful but also practical and durable.',
  },
  {
    name: 'Kalyani',
    role: 'Civil Engineer',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face',
    icon: Ruler,
    color: 'pink',
    quote: 'In engineering and fashion, attention to detail makes all the difference.',
    description: 'Kalyani combines her civil engineering expertise with an innate sense of style and analytical thinking.',
  },
]

const approaches = [
  {
    icon: Palette,
    title: 'Architectural Aesthetics',
    description: 'We consider draping as structural design, patterns as floor plans, and colors as the palette that brings spaces to life.',
    gradient: 'from-rose-500 to-pink-500',
    bg: 'bg-rose-50',
  },
  {
    icon: Ruler,
    title: 'Engineering Precision',
    description: 'Every stitch, seam, and finish is executed with meticulous attention to detail, built to last.',
    gradient: 'from-orange-500 to-amber-500',
    bg: 'bg-orange-50',
  },
  {
    icon: Heart,
    title: 'Passion-Driven Design',
    description: 'Every collection is born from genuine love for the craft, inspired by our cultural heritage and modern trends.',
    gradient: 'from-pink-500 to-rose-500',
    bg: 'bg-pink-50',
  },
  {
    icon: Users,
    title: 'Sisterhood Values',
    description: 'Our collaborative spirit ensures diverse perspectives, resulting in collections for all tastes.',
    gradient: 'from-purple-500 to-violet-500',
    bg: 'bg-purple-50',
  },
]

const benefits = [
  { icon: Award, title: 'Premium Quality', description: 'Finest materials with meticulous attention', color: 'rose' },
  { icon: Building2, title: 'Expert Design', description: 'Architectural precision meets fashion', color: 'orange' },
  { icon: Heart, title: 'Made with Love', description: 'Every piece carries our passion', color: 'pink' },
  { icon: Users, title: 'Customer First', description: 'Your satisfaction is our measure', color: 'purple' },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section - Mobile First */}
      <section className="relative min-h-[90vh] md:min-h-[80vh] flex items-center overflow-hidden">
        {/* Background with gradient and pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-rose-200 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-200 rounded-full blur-3xl animate-float animation-delay-500" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-200 rounded-full blur-3xl animate-float animation-delay-300" />
        </div>

        {/* Decorative elements */}
        <div className="absolute top-10 right-10 md:top-20 md:right-20">
          <Sparkles className="w-8 h-8 md:w-12 md:h-12 text-rose-300 animate-bounce-soft" />
        </div>
        <div className="absolute bottom-20 left-10 md:bottom-32 md:left-20">
          <Star className="w-6 h-6 md:w-10 md:h-10 text-orange-300 animate-spin-slow" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <div className="animate-slide-up">
              <span className="inline-block px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full text-rose-600 font-medium text-sm mb-6 shadow-sm">
                Our Story
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 animate-slide-up animation-delay-100">
              About{' '}
              <span className="gradient-text-rose">Saakie_byknk</span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-gray-600 font-light max-w-2xl mx-auto mb-8 animate-slide-up animation-delay-200">
              Where engineering precision meets fashion passion
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up animation-delay-300">
              <Link
                href="/products"
                className="group inline-flex items-center justify-center px-8 py-4 bg-rose-600 text-white font-medium rounded-full hover:bg-rose-700 transition-all hover:shadow-lg hover:scale-105"
              >
                Explore Collection
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/our-story"
                className="inline-flex items-center justify-center px-8 py-4 bg-white text-gray-900 font-medium rounded-full border border-gray-200 hover:border-rose-200 hover:bg-rose-50 transition-all"
              >
                Read Our Story
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce-soft">
          <div className="w-6 h-10 border-2 border-gray-400 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-3 bg-gray-400 rounded-full animate-slide-up" />
          </div>
        </div>
      </section>

      {/* Introduction Section */}
      <section className="py-16 md:py-24 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
              {/* Image side */}
              <div className="relative animate-slide-left order-2 md:order-1">
                <div className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl">
                  <Image
                    src="https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&h=1000&fit=crop"
                    alt="Traditional Indian Fashion"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                </div>
                {/* Floating card */}
                <div className="absolute -bottom-6 -right-6 md:-right-12 bg-white rounded-2xl p-4 md:p-6 shadow-xl animate-float">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center">
                      <Heart className="w-6 h-6 text-rose-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Crafted with Love</p>
                      <p className="text-sm text-gray-500">Since 2020</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Text side */}
              <div className="order-1 md:order-2 animate-slide-right">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                  Built on Strong Foundations
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed mb-6">
                  Saakie_byknk is the brainchild of three sisters who brought together their professional expertise and lifelong passion for fashion.
                </p>
                <p className="text-lg text-gray-600 leading-relaxed mb-8">
                  With backgrounds in architecture and civil engineering, we approach fashion the way we approach our craft — with precision, creativity, and an eye for detail that transforms ordinary into extraordinary.
                </p>
                <div className="bg-gradient-to-r from-rose-100 to-orange-100 rounded-2xl p-6 md:p-8">
                  <p className="text-lg md:text-xl text-gray-800 italic text-center">
                    &ldquo;We design fashion like we design buildings — with a strong foundation, beautiful aesthetics, and structures that stand the test of time.&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Meet the Founders - Card Carousel on Mobile */}
      <section className="py-16 md:py-24 bg-gray-50 overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12 md:mb-16">
              <span className="inline-block px-4 py-2 bg-rose-100 rounded-full text-rose-600 font-medium text-sm mb-4">
                The Team
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Meet the Founders
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto text-lg">
                Three sisters, united by blood and bound by their love for fashion
              </p>
            </div>

            {/* Mobile Scroll Cards */}
            <div className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-3 md:overflow-visible">
              {founders.map((founder, index) => {
                const Icon = founder.icon
                const colorClasses = {
                  rose: { bg: 'bg-rose-100', text: 'text-rose-600', gradient: 'from-rose-400 to-rose-500' },
                  orange: { bg: 'bg-orange-100', text: 'text-orange-600', gradient: 'from-orange-400 to-orange-500' },
                  pink: { bg: 'bg-pink-100', text: 'text-pink-600', gradient: 'from-pink-400 to-pink-500' },
                }[founder.color]

                return (
                  <div
                    key={founder.name}
                    className={`flex-shrink-0 w-[85vw] sm:w-[70vw] md:w-full snap-center animate-slide-up`}
                    style={{ animationDelay: `${index * 150}ms` }}
                  >
                    <div className="bg-white rounded-3xl overflow-hidden shadow-lg hover-lift h-full">
                      {/* Image */}
                      <div className={`h-64 md:h-72 bg-gradient-to-br ${colorClasses?.gradient} relative overflow-hidden`}>
                        <Image
                          src={founder.image}
                          alt={`${founder.name} - ${founder.role}`}
                          fill
                          className="object-cover mix-blend-overlay opacity-90"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        <div className="absolute bottom-4 left-4 right-4">
                          <h3 className="text-2xl md:text-3xl font-bold text-white mb-1">{founder.name}</h3>
                          <div className="flex items-center text-white/90">
                            <Icon className="w-4 h-4 mr-2" />
                            <span className="font-medium">{founder.role}</span>
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-6 md:p-8">
                        <p className="text-gray-600 leading-relaxed mb-6">
                          {founder.description}
                        </p>
                        <div className={`${colorClasses?.bg} rounded-xl p-4`}>
                          <p className={`text-sm ${colorClasses?.text} italic font-medium`}>
                            &ldquo;{founder.quote}&rdquo;
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Our Unique Approach - Staggered Grid */}
      <section className="py-16 md:py-24 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12 md:mb-16">
              <span className="inline-block px-4 py-2 bg-orange-100 rounded-full text-orange-600 font-medium text-sm mb-4">
                What Makes Us Different
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900">
                Our Unique Approach
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-6 md:gap-8">
              {approaches.map((approach, index) => {
                const Icon = approach.icon
                return (
                  <div
                    key={approach.title}
                    className={`${approach.bg} rounded-3xl p-6 md:p-8 hover-lift animate-slide-up`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className={`w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br ${approach.gradient} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}>
                      <Icon className="w-7 h-7 md:w-8 md:h-8 text-white" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">{approach.title}</h3>
                    <p className="text-gray-600 leading-relaxed text-base md:text-lg">
                      {approach.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision - Full Width Cards */}
      <section className="py-16 md:py-24 bg-gray-900 text-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-rose-500 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-500 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 md:gap-12">
              {/* Mission */}
              <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 md:p-10 border border-white/10 hover-lift">
                <div className="flex items-center mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-rose-500 to-pink-500 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                    <Target className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold">Our Mission</h2>
                </div>
                <p className="text-gray-300 text-lg leading-relaxed">
                  To blend traditional craftsmanship with contemporary design, creating fashion that celebrates Indian heritage while embracing modern elegance. We strive to make premium fashion accessible, ensuring every woman can express her unique style with confidence.
                </p>
              </div>

              {/* Vision */}
              <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 md:p-10 border border-white/10 hover-lift">
                <div className="flex items-center mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                    <Eye className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold">Our Vision</h2>
                </div>
                <p className="text-gray-300 text-lg leading-relaxed">
                  To become a beloved fashion destination that women trust for quality, style, and authenticity. We envision Saakie_byknk as a brand that not only dresses women beautifully but also inspires them to embrace their heritage with pride.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us - Horizontal Scroll on Mobile */}
      <section className="py-16 md:py-24 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-2 bg-purple-100 rounded-full text-purple-600 font-medium text-sm mb-4">
                Why Us
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900">
                Why Choose Saakie_byknk?
              </h2>
            </div>

            <div className="flex gap-6 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-hide sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon
                const colors = {
                  rose: { bg: 'bg-rose-100', text: 'text-rose-600' },
                  orange: { bg: 'bg-orange-100', text: 'text-orange-600' },
                  pink: { bg: 'bg-pink-100', text: 'text-pink-600' },
                  purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
                }[benefit.color]

                return (
                  <div
                    key={benefit.title}
                    className="flex-shrink-0 w-[70vw] sm:w-full snap-center text-center p-6 md:p-8 bg-white rounded-3xl shadow-sm hover-lift animate-slide-up border border-gray-100"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className={`w-20 h-20 ${colors?.bg} rounded-full flex items-center justify-center mx-auto mb-6`}>
                      <Icon className={`w-10 h-10 ${colors?.text}`} />
                    </div>
                    <h3 className="font-bold text-gray-900 text-xl mb-3">{benefit.title}</h3>
                    <p className="text-gray-600">{benefit.description}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-rose-200 rounded-full blur-2xl opacity-60" />
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-orange-200 rounded-full blur-2xl opacity-60" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Join Our Journey
            </h2>
            <p className="text-lg md:text-xl text-gray-600 mb-10">
              Experience the perfect blend of engineering excellence and fashion passion. Discover our collections and become part of the Saakie family.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/products"
                className="group inline-flex items-center justify-center px-8 py-4 bg-rose-600 text-white font-medium rounded-full hover:bg-rose-700 transition-all hover:shadow-xl hover:scale-105"
              >
                Shop Now
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/our-story"
                className="inline-flex items-center justify-center px-8 py-4 bg-white text-gray-900 font-medium rounded-full border border-gray-200 hover:border-rose-300 hover:bg-rose-50 transition-all shadow-sm"
              >
                Read Our Story
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
