'use client'

import { Heart, Sparkles, Users, Star, ArrowRight, Quote } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

const founders = [
  {
    name: 'Krutika',
    role: 'Co-Founder',
    image: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400&h=400&fit=crop&crop=face',
    gradient: 'from-rose-400 to-rose-500',
    letter: 'K',
  },
  {
    name: 'Neha',
    role: 'Co-Founder',
    image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop&crop=face',
    gradient: 'from-orange-400 to-orange-500',
    letter: 'N',
  },
  {
    name: 'Kalyani',
    role: 'Co-Founder',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face',
    gradient: 'from-pink-400 to-pink-500',
    letter: 'K',
  },
]

const timeline = [
  {
    year: 'Childhood',
    title: 'Where It All Began',
    description: 'Three sisters gathered around their beloved Nani, listening to enchanting tales called "Sakhie" in their Banjari tradition.',
    icon: Heart,
    color: 'rose',
  },
  {
    year: '2018',
    title: 'A Dream Takes Shape',
    description: 'The sisters, now architects and engineers, began dreaming of bringing their passion for fashion to life.',
    icon: Sparkles,
    color: 'orange',
  },
  {
    year: '2020',
    title: 'Saakie_byknk Is Born',
    description: 'From "Sakhie" came "Saakie" — a tribute to Nani, heritage, and the timeless art of storytelling through fashion.',
    icon: Star,
    color: 'pink',
  },
  {
    year: 'Today',
    title: 'Weaving Dreams',
    description: 'Every piece in our collection tells a story, crafted with the same dedication and love that Nani poured into her tales.',
    icon: Users,
    color: 'purple',
  },
]

const values = [
  {
    icon: Heart,
    title: 'Heritage & Love',
    description: 'Every design is infused with the love and traditions passed down through generations, honoring our roots while embracing modern elegance.',
    gradient: 'from-rose-500 to-pink-500',
    bg: 'bg-gradient-to-br from-rose-50 to-pink-50',
  },
  {
    icon: Sparkles,
    title: 'Craftsmanship',
    description: 'Like the carefully chosen words in Nani\'s stories, every stitch and detail in our garments is thoughtfully crafted with precision and care.',
    gradient: 'from-orange-500 to-amber-500',
    bg: 'bg-gradient-to-br from-orange-50 to-amber-50',
  },
  {
    icon: Users,
    title: 'Sisterhood',
    description: 'Built on the unbreakable bond of three sisters, we celebrate the strength, support, and joy that women bring to each other\'s lives.',
    gradient: 'from-pink-500 to-rose-500',
    bg: 'bg-gradient-to-br from-pink-50 to-rose-50',
  },
]

export default function OurStoryPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-[90vh] md:min-h-[80vh] flex items-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-rose-200 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-200 rounded-full blur-3xl animate-float animation-delay-500" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-200 rounded-full blur-3xl animate-float animation-delay-300" />
        </div>

        {/* Decorative elements */}
        <div className="absolute top-20 right-10 md:right-20 animate-float">
          <Quote className="w-10 h-10 md:w-16 md:h-16 text-rose-300/50" />
        </div>
        <div className="absolute bottom-32 left-10 md:left-20 animate-float animation-delay-500">
          <Star className="w-8 h-8 md:w-12 md:h-12 text-orange-300/50" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <div className="animate-slide-up">
              <span className="inline-block px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full text-rose-600 font-medium text-sm mb-6 shadow-sm">
                The Beginning
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 animate-slide-up animation-delay-100">
              Our{' '}
              <span className="gradient-text-rose">Story</span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-gray-600 font-light max-w-2xl mx-auto mb-8 animate-slide-up animation-delay-200">
              Where childhood memories weave into timeless fashion
            </p>
            <div className="animate-slide-up animation-delay-300">
              <a
                href="#story"
                className="group inline-flex items-center px-8 py-4 bg-rose-600 text-white font-medium rounded-full hover:bg-rose-700 transition-all hover:shadow-lg"
              >
                Read Our Story
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
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

      {/* Origin Story Section */}
      <section id="story" className="py-16 md:py-24 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Image */}
              <div className="relative animate-slide-left order-2 lg:order-1">
                <div className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl">
                  <Image
                    src="https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&h=1000&fit=crop"
                    alt="Traditional Indian Fashion"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                </div>
                {/* Quote card */}
                <div className="absolute -bottom-6 -right-6 lg:-right-12 bg-white rounded-2xl p-6 shadow-xl max-w-xs animate-float">
                  <Quote className="w-8 h-8 text-rose-300 mb-2" />
                  <p className="text-gray-700 italic">
                    &ldquo;Every great journey begins with a story told by someone we love...&rdquo;
                  </p>
                </div>
              </div>

              {/* Story Content */}
              <div className="order-1 lg:order-2 animate-slide-right">
                <span className="inline-block px-4 py-2 bg-rose-100 rounded-full text-rose-600 font-medium text-sm mb-6">
                  The Tale of Three Sisters
                </span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                  A Story Woven with Love
                </h2>
                <div className="space-y-6 text-lg text-gray-600 leading-relaxed">
                  <p>
                    In the warm embrace of our childhood home, three sisters — <strong className="text-rose-600">Neha</strong>, <strong className="text-rose-600">Krutika</strong>, and <strong className="text-rose-600">Kalyani</strong> — would gather around our beloved Nani, eagerly awaiting her enchanting tales.
                  </p>
                  <p>
                    In our Banjari tradition, these cherished story sessions are called <strong className="text-rose-600">&ldquo;Sakhie&rdquo;</strong> — a word that holds the essence of sisterhood, storytelling, and the bonds that tie generations together.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Name Origin - Highlight Section */}
      <section className="py-16 md:py-24 bg-gray-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-96 h-96 bg-rose-500 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-500 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="animate-scale-in">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full mb-8">
                <Sparkles className="w-10 h-10 text-rose-400" />
              </div>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-8 animate-slide-up">
              From{' '}
              <span className="text-rose-400">&ldquo;Sakhie&rdquo;</span>{' '}
              was born{' '}
              <span className="text-orange-400">&ldquo;Saakie&rdquo;</span>
            </h2>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 animate-slide-up animation-delay-100">
              by <span className="text-rose-400 font-semibold">K</span>rutika,{' '}
              <span className="text-orange-400 font-semibold">N</span>eha &{' '}
              <span className="text-pink-400 font-semibold">K</span>alyani
            </p>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto animate-slide-up animation-delay-200">
              A tribute to our Nani, our heritage, and the timeless art of storytelling through fashion.
            </p>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-16 md:py-24 lg:py-32 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-2 bg-orange-100 rounded-full text-orange-600 font-medium text-sm mb-4">
                Our Journey
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900">
                The Path We Traveled
              </h2>
            </div>

            {/* Timeline */}
            <div className="relative">
              {/* Vertical line - hidden on mobile */}
              <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-rose-200 via-orange-200 to-pink-200 rounded-full" />

              <div className="space-y-12 md:space-y-0">
                {timeline.map((item, index) => {
                  const Icon = item.icon
                  const isLeft = index % 2 === 0
                  const colorClasses = {
                    rose: { bg: 'bg-rose-500', light: 'bg-rose-100', text: 'text-rose-600' },
                    orange: { bg: 'bg-orange-500', light: 'bg-orange-100', text: 'text-orange-600' },
                    pink: { bg: 'bg-pink-500', light: 'bg-pink-100', text: 'text-pink-600' },
                    purple: { bg: 'bg-purple-500', light: 'bg-purple-100', text: 'text-purple-600' },
                  }[item.color]

                  return (
                    <div
                      key={item.year}
                      className={`relative md:flex items-center ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'} animate-slide-up`}
                      style={{ animationDelay: `${index * 150}ms` }}
                    >
                      {/* Content */}
                      <div className={`md:w-1/2 ${isLeft ? 'md:pr-12 md:text-right' : 'md:pl-12'}`}>
                        <div className={`bg-white rounded-3xl p-6 md:p-8 shadow-lg hover-lift ${isLeft ? '' : ''}`}>
                          <span className={`inline-block px-3 py-1 ${colorClasses?.light} ${colorClasses?.text} text-sm font-semibold rounded-full mb-4`}>
                            {item.year}
                          </span>
                          <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
                            {item.title}
                          </h3>
                          <p className="text-gray-600 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      {/* Center icon - visible on desktop */}
                      <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2 items-center justify-center">
                        <div className={`w-14 h-14 ${colorClasses?.bg} rounded-full flex items-center justify-center shadow-lg`}>
                          <Icon className="w-7 h-7 text-white" />
                        </div>
                      </div>

                      {/* Mobile icon */}
                      <div className={`md:hidden absolute -left-3 top-6 w-10 h-10 ${colorClasses?.bg} rounded-full flex items-center justify-center shadow-lg`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>

                      {/* Mobile vertical line */}
                      <div className="md:hidden absolute left-1 top-0 w-0.5 h-full bg-gradient-to-b from-rose-200 to-pink-200" />

                      {/* Empty space for the other side on desktop */}
                      <div className="hidden md:block md:w-1/2" />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Meet the Sisters */}
      <section className="py-16 md:py-24 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <span className="inline-block px-4 py-2 bg-pink-100 rounded-full text-pink-600 font-medium text-sm mb-4">
              The Founders
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Meet the Sisters
            </h2>
            <p className="text-lg text-gray-600 mb-12">
              Three sisters, one dream, countless stories to share
            </p>

            <div className="flex gap-6 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-hide sm:grid sm:grid-cols-3 sm:overflow-visible sm:gap-8">
              {founders.map((founder, index) => (
                <div
                  key={founder.name}
                  className="group flex-shrink-0 w-[70vw] sm:w-full snap-center animate-slide-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="relative">
                    <div className={`w-32 h-32 sm:w-40 sm:h-40 bg-gradient-to-br ${founder.gradient} rounded-full mx-auto overflow-hidden group-hover:scale-105 transition-transform duration-300 shadow-lg`}>
                      <Image
                        src={founder.image}
                        alt={`${founder.name} - ${founder.role}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                    {/* Letter badge */}
                    <div className={`absolute -bottom-2 -right-2 sm:right-1/4 w-10 h-10 bg-gradient-to-br ${founder.gradient} rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                      {founder.letter}
                    </div>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6">{founder.name}</h3>
                  <p className="text-gray-600">{founder.role}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12 md:mb-16">
              <span className="inline-block px-4 py-2 bg-purple-100 rounded-full text-purple-600 font-medium text-sm mb-4">
                Our Values
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900">
                What We Stand For
              </h2>
            </div>

            <div className="grid sm:grid-cols-3 gap-6 md:gap-8">
              {values.map((value, index) => {
                const Icon = value.icon
                return (
                  <div
                    key={value.title}
                    className={`${value.bg} rounded-3xl p-6 md:p-8 text-center hover-lift animate-slide-up`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className={`w-16 h-16 bg-gradient-to-br ${value.gradient} rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">{value.title}</h3>
                    <p className="text-gray-600 leading-relaxed">
                      {value.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Closing Quote Section */}
      <section className="py-16 md:py-24 lg:py-32 bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 relative overflow-hidden">
        <div className="absolute top-10 left-10 w-40 h-40 bg-rose-200 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-10 right-10 w-60 h-60 bg-orange-200 rounded-full blur-3xl opacity-50" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <Quote className="w-16 h-16 text-rose-300 mx-auto mb-8 animate-bounce-soft" />
            <blockquote className="text-2xl sm:text-3xl md:text-4xl font-light text-gray-800 italic leading-relaxed mb-8 animate-slide-up">
              &ldquo;Just as every Sakhie told by our Nani carried a piece of her heart, every creation from Saakie carries a piece of ours.&rdquo;
            </blockquote>
            <p className="text-rose-600 font-semibold text-xl animate-slide-up animation-delay-100">
              — Neha, Krutika & Kalyani
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gray-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-rose-500 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
              Be Part of Our Story
            </h2>
            <p className="text-lg md:text-xl text-gray-300 mb-10">
              Every piece in our collection tells a story. Discover the one that speaks to you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/products"
                className="group inline-flex items-center justify-center px-8 py-4 bg-rose-600 text-white font-medium rounded-full hover:bg-rose-700 transition-all hover:shadow-xl"
              >
                Explore Collection
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center justify-center px-8 py-4 bg-transparent text-white font-medium rounded-full border-2 border-white/30 hover:bg-white/10 transition-all"
              >
                Learn More About Us
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
