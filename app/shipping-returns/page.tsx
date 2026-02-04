'use client'

import { Truck, Package, RefreshCw, Clock, MapPin, Shield, CreditCard, HelpCircle } from 'lucide-react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

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
                <p className="font-bold text-2xl text-gray-900">7</p>
                <p className="text-sm text-gray-600">Days Returns</p>
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

        {/* Shipping Section */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-rose-100 rounded-lg flex items-center justify-center">
                  <Truck className="w-6 h-6 text-rose-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Shipping Information</h2>
              </div>

              <div className="space-y-8">
                {/* Shipping Rates */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="font-semibold text-xl text-gray-900 mb-4">Shipping Rates</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Order Value</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Standard Shipping</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Express Shipping</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-600">
                        <tr className="border-b border-gray-100">
                          <td className="py-3 px-4">Below ₹999</td>
                          <td className="py-3 px-4">₹99</td>
                          <td className="py-3 px-4">₹249</td>
                        </tr>
                        <tr className="border-b border-gray-100">
                          <td className="py-3 px-4">₹999 - ₹2,999</td>
                          <td className="py-3 px-4 text-green-600 font-medium">FREE</td>
                          <td className="py-3 px-4">₹149</td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4">Above ₹2,999</td>
                          <td className="py-3 px-4 text-green-600 font-medium">FREE</td>
                          <td className="py-3 px-4 text-green-600 font-medium">FREE</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Delivery Times */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="font-semibold text-xl text-gray-900 mb-4">Delivery Times</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Standard Delivery</h4>
                      <ul className="space-y-2 text-gray-600">
                        <li className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                          Metro Cities: 5-7 business days
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                          Other Cities: 7-10 business days
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                          Remote Areas: 10-14 business days
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Express Delivery</h4>
                      <ul className="space-y-2 text-gray-600">
                        <li className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          Metro Cities: 2-3 business days
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          Other Cities: 3-5 business days
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                          Remote Areas: Not available
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Order Tracking */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="font-semibold text-xl text-gray-900 mb-4">Order Tracking</h3>
                  <p className="text-gray-600 mb-4">
                    Once your order is shipped, you will receive an email and SMS with tracking details. You can track your order by:
                  </p>
                  <ul className="space-y-2 text-gray-600">
                    <li className="flex items-start gap-2">
                      <span className="text-rose-600 font-bold">1.</span>
                      Clicking the tracking link in your shipping confirmation email
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-rose-600 font-bold">2.</span>
                      Logging into your account and visiting &ldquo;My Orders&rdquo;
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-rose-600 font-bold">3.</span>
                      Contacting our customer support with your order ID
                    </li>
                  </ul>
                </div>
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
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-green-600 mb-2">Eligible for Return</h4>
                      <ul className="space-y-2 text-gray-600">
                        <li className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-green-500" />
                          Unused and unwashed items
                        </li>
                        <li className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-green-500" />
                          Original packaging intact
                        </li>
                        <li className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-green-500" />
                          All tags attached
                        </li>
                        <li className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-green-500" />
                          Within 7 days of delivery
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-red-600 mb-2">Not Eligible for Return</h4>
                      <ul className="space-y-2 text-gray-600">
                        <li className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-red-500" />
                          Customized/altered products
                        </li>
                        <li className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-red-500" />
                          Innerwear and lingerie
                        </li>
                        <li className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-red-500" />
                          Sale items (final sale)
                        </li>
                        <li className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-red-500" />
                          Items without tags
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
                        <h4 className="font-medium text-gray-900">Log into your account</h4>
                        <p className="text-gray-600 text-sm">Go to &ldquo;My Orders&rdquo; and select the order containing the item you wish to return</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-rose-600 font-bold">2</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Click &ldquo;Return Item&rdquo;</h4>
                        <p className="text-gray-600 text-sm">Select the item(s) you want to return and choose a reason</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-rose-600 font-bold">3</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Schedule pickup</h4>
                        <p className="text-gray-600 text-sm">Choose a convenient date and time for our courier to collect the item</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-rose-600 font-bold">4</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Receive refund</h4>
                        <p className="text-gray-600 text-sm">Once we receive and verify the item, your refund will be processed within 5-7 business days</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Refund Information */}
                <div className="bg-white rounded-xl p-6">
                  <h3 className="font-semibold text-xl text-gray-900 mb-4">Refund Information</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="flex items-start gap-3">
                      <CreditCard className="w-6 h-6 text-rose-600 flex-shrink-0 mt-1" />
                      <div>
                        <h4 className="font-medium text-gray-900">Card/UPI Payments</h4>
                        <p className="text-gray-600 text-sm">Refunded to original payment method within 5-7 business days</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Package className="w-6 h-6 text-rose-600 flex-shrink-0 mt-1" />
                      <div>
                        <h4 className="font-medium text-gray-900">COD Orders</h4>
                        <p className="text-gray-600 text-sm">Refunded to your bank account (NEFT/IMPS) within 7-10 business days</p>
                      </div>
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
                  href="/faq"
                  className="inline-flex items-center justify-center px-6 py-3 bg-white text-gray-900 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  View FAQ
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  )
}
