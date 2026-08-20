'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Facebook, Instagram, Twitter, Youtube, Mail, Phone, MapPin } from 'lucide-react'
import { fetchApi } from '@/lib/api'

const footerLinks = {
  shop: [
    { name: 'New Arrivals', href: '/products?sort=newest' },
    { name: 'All Products', href: '/products' },
    { name: 'Sale', href: '/products?sale=true' },
  ],
  help: [
    { name: 'Care Instructions', href: '/care-instructions' },
    { name: 'Shipping & Returns', href: '/shipping-returns' },
    { name: 'Contact Us', href: '/contact' },
  ],
  company: [
    { name: 'About Us', href: '/about' },
    { name: 'Our Story', href: '/our-story' },
    { name: 'Blog', href: '/blog' },
  ],
  legal: [
    { name: 'Privacy Policy', href: '/privacy-policy' },
    { name: 'Terms of Service', href: '/terms-of-service' },
    { name: 'Return Policy', href: '/return-policy' },
    { name: 'Disclaimer', href: '/disclaimer' },
  ],
}

const socialLinks = [
  { name: 'Facebook', href: '#', icon: Facebook },
  { name: 'Instagram', href: '#', icon: Instagram },
  { name: 'Twitter', href: '#', icon: Twitter },
  { name: 'YouTube', href: '#', icon: Youtube },
]

export function Footer() {
  // Same cache entry as the header's query, so the two together cost one
  // request. Links to an empty sale listing or an empty blog index are
  // dropped rather than shipping a dead end.
  const { data: navCounts } = useQuery<{ sale: number; blog: number }>({
    queryKey: ['nav-counts'],
    queryFn: async () => {
      const response = await fetchApi('/api/nav-counts')
      if (!response.ok) throw new Error('Failed to load nav counts')
      return response.json()
    },
    staleTime: 5 * 60 * 1000,
  })
  const hasSaleItems = (navCounts?.sale ?? 0) > 0
  const hasBlogPosts = (navCounts?.blog ?? 0) > 0

  const shopLinks = footerLinks.shop.filter(
    (link) => hasSaleItems || link.href !== '/products?sale=true'
  )
  const companyLinks = footerLinks.company.filter(
    (link) => hasBlogPosts || link.href !== '/blog'
  )

  return (
    <footer className="bg-gray-900 text-white pb-safe">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2">
            <Link href="/" className="block mb-4">
              <h2 className="text-2xl font-bold text-white">Saakie_byknk</h2>
            </Link>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Your trusted destination for premium fashion. 
              We bring you the finest collection of contemporary and traditional 
              fashion from across India, crafted with love and precision.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center text-gray-300">
                <Mail size={18} className="mr-3 flex-shrink-0" />
                <span>saakiebyknk@gmail.com</span>
              </div>
              <div className="flex items-center text-gray-300">
                <Phone size={18} className="mr-3 flex-shrink-0" />
                <span>+91 7219160782</span>
              </div>
              <div className="flex items-start text-gray-300">
                <MapPin size={18} className="mr-3 flex-shrink-0 mt-1" />
                <span>Pune, Maharashtra, India</span><br/>
                <span>Yavatmal, Maharashtra, India</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">Shop</h3>
            <ul className="space-y-2">
              {shopLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">Help</h3>
            <ul className="space-y-2">
              {footerLinks.help.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">Company</h3>
            <ul className="space-y-2">
              {companyLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex flex-wrap items-center gap-4 mb-4 md:mb-0">
              {footerLinks.legal.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </div>

            <div className="flex items-center space-x-4">
              {socialLinks.map((social) => {
                const Icon = social.icon
                return (
                  <Link
                    key={social.name}
                    href={social.href}
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label={social.name}
                  >
                    <Icon size={20} />
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400 text-sm">
            <p>&copy; 2024 Saakie_byknk. All rights reserved. Made with ❤️ in India.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
