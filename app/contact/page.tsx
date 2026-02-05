'use client'

import { useState } from 'react'
import { Mail, Phone, MapPin, Clock, Send, MessageCircle } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000))

    setSubmitted(true)
    setIsSubmitting(false)
    setFormData({ name: '', email: '', phone: '', subject: '', message: '' })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 py-16 lg:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Get in Touch
              </h1>
              <p className="text-lg text-gray-600">
                We&apos;d love to hear from you. Send us a message and we&apos;ll respond as soon as possible.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Info Cards */}
        <section className="py-12 -mt-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              <div className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-6 h-6 text-rose-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Phone</h3>
                <p className="text-gray-600 text-sm">+91 98765 43210</p>
                <p className="text-gray-600 text-sm">+91 98765 43211</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-6 h-6 text-rose-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Email</h3>
                <p className="text-gray-600 text-sm">support@saakie-byknk.com</p>
                <p className="text-gray-600 text-sm">info@saakie-byknk.com</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-6 h-6 text-rose-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Address</h3>
                <p className="text-gray-600 text-sm">123 Fashion Street</p>
                <p className="text-gray-600 text-sm">Mumbai, MH 400001</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-6 h-6 text-rose-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Business Hours</h3>
                <p className="text-gray-600 text-sm">Mon - Sat: 10AM - 8PM</p>
                <p className="text-gray-600 text-sm">Sunday: 11AM - 6PM</p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Form Section */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Form */}
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-rose-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Send us a Message</h2>
                  </div>

                  {submitted ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Send className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-green-800 mb-2">Message Sent!</h3>
                      <p className="text-green-600">Thank you for contacting us. We&apos;ll get back to you within 24 hours.</p>
                      <button
                        onClick={() => setSubmitted(false)}
                        className="mt-4 text-rose-600 hover:text-rose-700 font-medium"
                      >
                        Send another message
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            id="name"
                            name="name"
                            required
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition-all"
                            placeholder="Your name"
                          />
                        </div>
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                            Email Address *
                          </label>
                          <input
                            type="email"
                            id="email"
                            name="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition-all"
                            placeholder="you@example.com"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition-all"
                            placeholder="+91 98765 43210"
                          />
                        </div>
                        <div>
                          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                            Subject *
                          </label>
                          <select
                            id="subject"
                            name="subject"
                            required
                            value={formData.subject}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition-all"
                          >
                            <option value="">Select a subject</option>
                            <option value="order">Order Inquiry</option>
                            <option value="product">Product Question</option>
                            <option value="return">Return/Exchange</option>
                            <option value="feedback">Feedback</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                          Message *
                        </label>
                        <textarea
                          id="message"
                          name="message"
                          required
                          rows={5}
                          value={formData.message}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition-all resize-none"
                          placeholder="How can we help you?"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-rose-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5" />
                            Send Message
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>

                {/* Map / Additional Info */}
                <div>
                  <div className="bg-gray-100 rounded-xl h-64 lg:h-80 mb-6 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Map placeholder</p>
                    </div>
                  </div>

                  <div className="bg-rose-50 rounded-xl p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Quick Support</h3>
                    <ul className="space-y-3 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <span className="text-rose-600 font-bold">-</span>
                        For order tracking, check your email for tracking details
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-rose-600 font-bold">-</span>
                        Returns can be initiated from your account dashboard
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-rose-600 font-bold">-</span>
                        Check our FAQ page for common questions
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-rose-600 font-bold">-</span>
                        WhatsApp support: +91 98765 43210
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  )
}
