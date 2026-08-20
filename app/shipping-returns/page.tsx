'use client'

import { Truck, Package, RefreshCw, Clock, MapPin, Shield, CreditCard, HelpCircle } from 'lucide-react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'

export default function ShippingReturnsPage() {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 py-16 lg:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Shipping & Returns
              </h1>
              <p className="text-lg text-gray-600">
                Everything you need to know about our shipping policies and return process
              </p>
            </div>
          </div>
        </section>

        {/* Quick Stats */}
        <section className="py-12 -mt-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Truck className="w-6 h-6 text-green-600" />
                </div>
                <p className="font-bold text-2xl text-gray-900">FREE</p>
                <p className="text-sm text-gray-600">Shipping over ₹999</p>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <p className="font-bold text-2xl text-gray-900">5-7</p>
                <p className="text-sm text-gray-600">Days Delivery</p>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <RefreshCw className="w-6 h-6 text-purple-600" />
                </div>
                <p className="font-bold text-2xl text-gray-900">24 hrs</p>
                <p className="text-sm text-gray-600">Damage Reporting</p>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MapPin className="w-6 h-6 text-rose-600" />
                </div>
                <p className="font-bold text-2xl text-gray-900">25K+</p>
                <p className="text-sm text-gray-600">Pin Codes</p>
              </div>
            </div>
          </div>
        </section>

        {/* Returns Section */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-purple-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Returns & Refunds</h2>
              </div>

              <div className="space-y-8">
                {/* Return Policy */}
                <div className="bg-white rounded-xl p-6">
                  <h3 className="font-semibold text-xl text-gray-900 mb-4">Return Policy</h3>
                  <p className="text-gray-600 mb-6">
                    At SAAKIE, we want you to be satisfied with your purchase. We accept
                    returns only for damaged items, verified with an uncut unboxing video.
                  </p>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-green-600 mb-2">Eligible for Return</h4>
                      <ul className="space-y-2 text-gray-600">
                        <li className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-green-500" />
                          Damaged items only
                        </li>
                        <li className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-green-500" />
                          Reported within 24 hrs of delivery
                        </li>
                        <li className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-green-500" />
                          Unboxing video without cuts provided
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-red-600 mb-2">Not Eligible for Return</h4>
                      <ul className="space-y-2 text-gray-600">
                        <li className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-red-500" />
                          Undamaged items (change of mind, fit, colour)
                        </li>
                        <li className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-red-500" />
                          Damage reported after 24 hrs of delivery
                        </li>
                        <li className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-red-500" />
                          No uncut unboxing video available
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* How to Return */}
                <div className="bg-white rounded-xl p-6">
                  <h3 className="font-semibold text-xl text-gray-900 mb-4">How to Initiate a Return</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-rose-600 font-bold">1</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Record an unboxing video</h4>
                        <p className="text-gray-600 text-sm">Film the package being opened in one continuous take, without cuts — this is required for verification</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-rose-600 font-bold">2</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Contact us within 24 hours</h4>
                        <p className="text-gray-600 text-sm">If your item arrived damaged, reach out within 24 hrs of delivery via our contact page</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-rose-600 font-bold">3</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Send the unboxing video</h4>
                        <p className="text-gray-600 text-sm">Share the uncut video with our team so we can verify the damage</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-rose-600 font-bold">4</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Receive refund</h4>
                        <p className="text-gray-600 text-sm">Once approved, your refund is issued to the original payment method</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Refund Information */}
                <div className="bg-white rounded-xl p-6">
                  <h3 className="font-semibold text-xl text-gray-900 mb-4">Refund Information</h3>
                  <div className="flex items-start gap-3">
                    <CreditCard className="w-6 h-6 text-rose-600 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-medium text-gray-900">Original Payment Method</h4>
                      <p className="text-gray-600 text-sm">Approved returns are refunded to the payment method used for the order</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <HelpCircle className="w-12 h-12 text-rose-600 mx-auto mb-4" />
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                Still have questions?
              </h2>
              <p className="text-gray-600 mb-8">
                Our customer support team is here to help with any shipping or return inquiries.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center px-6 py-3 bg-rose-600 text-white font-medium rounded-lg hover:bg-rose-700 transition-colors"
                >
                  Contact Support
                </Link>
                <Link
                  href="/return-policy"
                  className="inline-flex items-center justify-center px-6 py-3 bg-white text-gray-900 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  View Return Policy
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
