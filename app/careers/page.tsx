'use client'

import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import Link from 'next/link'
import Image from 'next/image'
import { Briefcase, Heart, Users, Sparkles, Rocket, Coffee, Gift, Clock, MapPin, Mail, ArrowRight, CheckCircle2 } from 'lucide-react'

const values = [
  {
    icon: Heart,
    title: 'Passion for Fashion',
    description: 'We are driven by our love for traditional Indian textiles and contemporary design.',
    gradient: 'from-rose-500 to-pink-500',
    bg: 'bg-gradient-to-br from-rose-50 to-pink-50',
  },
  {
    icon: Users,
    title: 'Customer First',
    description: 'Every decision we make is centered around delivering the best experience for our customers.',
    gradient: 'from-blue-500 to-cyan-500',
    bg: 'bg-gradient-to-br from-blue-50 to-cyan-50',
  },
  {
    icon: Sparkles,
    title: 'Innovation',
    description: 'We constantly evolve, blending tradition with modern technology and trends.',
    gradient: 'from-purple-500 to-violet-500',
    bg: 'bg-gradient-to-br from-purple-50 to-violet-50',
  },
  {
    icon: Rocket,
    title: 'Growth Mindset',
    description: 'We believe in continuous learning and growing together as a team.',
    gradient: 'from-orange-500 to-amber-500',
    bg: 'bg-gradient-to-br from-orange-50 to-amber-50',
  },
]

const perks = [
  { icon: Coffee, title: 'Flexible Hours', description: 'Work when you\'re most productive' },
  { icon: Gift, title: 'Employee Discounts', description: 'Amazing deals on our collections' },
  { icon: Rocket, title: 'Career Growth', description: 'Clear paths for advancement' },
  { icon: Heart, title: 'Health Benefits', description: 'Comprehensive health coverage' },
]

interface Position {
  title: string
  department: string
  location: string
  type: string
}

const openPositions: Position[] = [
  // Empty for now - no positions available
]

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-[80vh] md:min-h-[70vh] flex items-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1920&h=1080&fit=crop"
            alt="Team collaboration"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 via-gray-900/70 to-gray-900/50" />
        </div>

        {/* Floating elements */}
        <div className="absolute top-20 right-10 md:right-20 animate-float">
          <Sparkles className="w-10 h-10 md:w-14 md:h-14 text-rose-400/40" />
        </div>
        <div className="absolute bottom-32 left-10 md:left-20 animate-float animation-delay-500">
          <Rocket className="w-8 h-8 md:w-12 md:h-12 text-orange-400/40" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-20">
          <div className="max-w-3xl">
            <div className="animate-slide-up">
              <span className="inline-block px-4 py-2 bg-rose-500/20 backdrop-blur-sm rounded-full text-rose-300 font-medium text-sm mb-6 border border-rose-500/30">
                Join Our Team
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 animate-slide-up animation-delay-100">
              Build Something{' '}
              <span className="text-rose-400">Beautiful</span>{' '}
              With Us
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-gray-300 font-light max-w-2xl mb-8 animate-slide-up animation-delay-200">
              Be part of a passionate team dedicated to celebrating Indian heritage through beautiful fashion
            </p>
            <div className="flex flex-col sm:flex-row gap-4 animate-slide-up animation-delay-300">
              <a
                href="#positions"
                className="group inline-flex items-center justify-center px-8 py-4 bg-rose-600 text-white font-medium rounded-full hover:bg-rose-700 transition-all hover:shadow-lg"
              >
                View Open Positions
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href="#values"
                className="inline-flex items-center justify-center px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-medium rounded-full border border-white/30 hover:bg-white/20 transition-all"
              >
                Learn About Us
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

      {/* Stats Section */}
      <section className="py-12 md:py-16 bg-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-rose-500 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-orange-500 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {[
              { number: '3', label: 'Founders' },
              { number: '2020', label: 'Founded' },
              { number: '1000+', label: 'Happy Customers' },
              { number: '100%', label: 'Passion' },
            ].map((stat, index) => (
              <div
                key={stat.label}
                className="text-center animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-400 text-sm md:text-base">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Values Section */}
      <section id="values" className="py-16 md:py-24 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12 md:mb-16">
              <span className="inline-block px-4 py-2 bg-rose-100 rounded-full text-rose-600 font-medium text-sm mb-4">
                What We Believe
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Our Values
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                At Saakie, we believe in creating a workplace where creativity thrives and every team member contributes to our shared vision
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6 md:gap-8">
              {values.map((value, index) => {
                const Icon = value.icon
                return (
                  <div
                    key={value.title}
                    className={`${value.bg} rounded-3xl p-6 md:p-8 hover-lift animate-slide-up`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className={`w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br ${value.gradient} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}>
                      <Icon className="w-7 h-7 md:w-8 md:h-8 text-white" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">{value.title}</h3>
                    <p className="text-gray-600 leading-relaxed text-base md:text-lg">
                      {value.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Perks Section */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12 md:mb-16">
              <span className="inline-block px-4 py-2 bg-purple-100 rounded-full text-purple-600 font-medium text-sm mb-4">
                Benefits
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Why Work With Us
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                We take care of our team so they can focus on what they do best
              </p>
            </div>

            <div className="flex gap-6 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-hide sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible">
              {perks.map((perk, index) => {
                const Icon = perk.icon
                return (
                  <div
                    key={perk.title}
                    className="flex-shrink-0 w-[70vw] sm:w-full snap-center bg-white rounded-3xl p-6 md:p-8 text-center shadow-sm hover-lift animate-slide-up border border-gray-100"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{perk.title}</h3>
                    <p className="text-gray-600">{perk.description}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Open Positions Section */}
      <section id="positions" className="py-16 md:py-24 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12 md:mb-16">
              <span className="inline-block px-4 py-2 bg-orange-100 rounded-full text-orange-600 font-medium text-sm mb-4">
                Opportunities
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Open Positions
              </h2>
            </div>

            {openPositions.length > 0 ? (
              <div className="space-y-4">
                {openPositions.map((position, index) => (
                  <div
                    key={position.title}
                    className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-rose-200 hover:shadow-lg transition-all animate-slide-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{position.title}</h3>
                        <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-4 h-4" />
                            {position.department}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {position.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {position.type}
                          </span>
                        </div>
                      </div>
                      <button className="inline-flex items-center justify-center px-6 py-3 bg-rose-600 text-white font-medium rounded-full hover:bg-rose-700 transition-colors">
                        Apply Now
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* No Vacancies Card */
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-8 md:p-12 text-center animate-scale-in">
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-8">
                  <Briefcase className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                  No Open Positions Currently
                </h3>
                <p className="text-lg text-gray-600 mb-6 max-w-lg mx-auto">
                  Thank you for your interest in joining Saakie! We don&apos;t have any open positions at the moment, but we&apos;re always looking for talented individuals who share our passion.
                </p>
                <div className="bg-white rounded-2xl p-6 max-w-md mx-auto shadow-sm">
                  <p className="text-gray-600 mb-4">
                    Send us your resume and we&apos;ll keep it on file for future opportunities:
                  </p>
                  <a
                    href="mailto:careers@saakie-byknk.com"
                    className="group inline-flex items-center text-rose-600 hover:text-rose-700 font-semibold text-lg"
                  >
                    <Mail className="w-5 h-5 mr-2" />
                    careers@saakie-byknk.com
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Life at Saakie Section */}
      <section className="py-16 md:py-24 bg-gray-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-rose-500 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-500 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Content */}
              <div>
                <span className="inline-block px-4 py-2 bg-rose-500/20 rounded-full text-rose-300 font-medium text-sm mb-6">
                  Life at Saakie
                </span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
                  More Than Just a Workplace
                </h2>
                <p className="text-lg text-gray-300 mb-8 leading-relaxed">
                  At Saakie, we&apos;re building more than a brand — we&apos;re building a family. Founded by three sisters, our culture is rooted in collaboration, creativity, and mutual respect.
                </p>
                <ul className="space-y-4">
                  {[
                    'Collaborative and supportive environment',
                    'Opportunity to work with passionate people',
                    'Make a real impact on Indian fashion',
                    'Celebrate heritage while embracing innovation',
                  ].map((item, index) => (
                    <li
                      key={index}
                      className="flex items-center gap-3 text-gray-300 animate-slide-up"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <CheckCircle2 className="w-5 h-5 text-rose-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Image Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="relative aspect-[4/5] rounded-2xl overflow-hidden animate-slide-up">
                    <Image
                      src="https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=400&h=500&fit=crop"
                      alt="Fashion design"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="relative aspect-square rounded-2xl overflow-hidden animate-slide-up animation-delay-200">
                    <Image
                      src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=400&fit=crop"
                      alt="Team collaboration"
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
                <div className="space-y-4 pt-8">
                  <div className="relative aspect-square rounded-2xl overflow-hidden animate-slide-up animation-delay-100">
                    <Image
                      src="https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=400&h=400&fit=crop"
                      alt="Creative work"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="relative aspect-[4/5] rounded-2xl overflow-hidden animate-slide-up animation-delay-300">
                    <Image
                      src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&h=500&fit=crop"
                      alt="Fashion showcase"
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stay Connected Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 relative overflow-hidden">
        <div className="absolute top-10 left-10 w-32 h-32 bg-rose-200 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-orange-200 rounded-full blur-3xl opacity-50" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Stay Connected
            </h2>
            <p className="text-lg text-gray-600 mb-10">
              Follow us on social media to stay updated on new opportunities and be the first to know when positions open up
            </p>
            <div className="flex justify-center gap-4 mb-10">
              {[
                { name: 'Instagram', icon: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' },
                { name: 'LinkedIn', icon: 'M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z' },
                { name: 'Facebook', icon: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385h-3.047v-3.47h3.047v-2.642c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953h-1.514c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385c5.737-.9 10.125-5.864 10.125-11.854z' },
              ].map((social) => (
                <a
                  key={social.name}
                  href="#"
                  className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-gray-600 hover:bg-rose-500 hover:text-white transition-all shadow-sm hover:shadow-lg hover:-translate-y-1"
                  aria-label={social.name}
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d={social.icon} />
                  </svg>
                </a>
              ))}
            </div>
            <Link
              href="/"
              className="group inline-flex items-center justify-center px-8 py-4 bg-rose-600 text-white font-medium rounded-full hover:bg-rose-700 transition-all hover:shadow-xl"
            >
              Back to Home
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
