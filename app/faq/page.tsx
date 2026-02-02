'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Search, Package, Truck, CreditCard, RefreshCw, Ruler, Phone } from 'lucide-react'
import Link from 'next/link'

interface FAQItem {
  question: string
  answer: string
}

interface FAQCategory {
  title: string
  icon: React.ComponentType<{ className?: string }>
  faqs: FAQItem[]
}

const faqData: FAQCategory[] = [
  {
    title: 'Orders & Payment',
    icon: CreditCard,
    faqs: [
      {
        question: 'What payment methods do you accept?',
        answer: 'We accept all major credit and debit cards (Visa, MasterCard, American Express), UPI payments, net banking, and popular wallets like Paytm, PhonePe, and Google Pay. We also offer Cash on Delivery (COD) for select locations.'
      },
      {
        question: 'How can I track my order?',
        answer: 'Once your order is shipped, you will receive an email and SMS with the tracking details. You can also track your order by logging into your account and visiting the "My Orders" section. Click on the specific order to view real-time tracking information.'
      },
      {
        question: 'Can I cancel or modify my order?',
        answer: 'You can cancel or modify your order within 2 hours of placing it, provided it has not been shipped yet. To cancel, go to "My Orders" in your account and click on "Cancel Order". For modifications, please contact our customer support team immediately.'
      },
      {
        question: 'Is it safe to use my credit/debit card on your website?',
        answer: 'Yes, absolutely! We use industry-standard SSL encryption and secure payment gateways to ensure your financial information is protected. We do not store your card details on our servers.'
      },
      {
        question: 'Why was my payment declined?',
        answer: 'Payment can be declined due to insufficient funds, incorrect card details, bank restrictions, or technical issues. Please verify your card details and try again. If the problem persists, contact your bank or try an alternative payment method.'
      }
    ]
  },
  {
    title: 'Shipping & Delivery',
    icon: Truck,
    faqs: [
      {
        question: 'What are the shipping charges?',
        answer: 'We offer FREE shipping on all orders above ₹999. For orders below ₹999, a flat shipping fee of ₹99 is applicable. Express delivery is available at an additional charge of ₹149.'
      },
      {
        question: 'How long does delivery take?',
        answer: 'Standard delivery takes 5-7 business days for metro cities and 7-10 business days for other locations. Express delivery (available for select pin codes) takes 2-3 business days. During sales and festive seasons, delivery may take slightly longer.'
      },
      {
        question: 'Do you deliver to my location?',
        answer: 'We deliver across India to over 25,000+ pin codes. Enter your pin code on the product page or during checkout to verify if we deliver to your area. Currently, we do not offer international shipping.'
      },
      {
        question: 'What if I am not available to receive my order?',
        answer: 'Our delivery partner will attempt delivery 2-3 times. If you are unavailable, they will contact you to reschedule. You can also provide an alternate address or authorize someone else to receive the package on your behalf.'
      },
      {
        question: 'Can I change my delivery address after placing an order?',
        answer: 'Address changes are possible only before the order is shipped. Please contact our customer support team as soon as possible with your order ID and the new address details.'
      }
    ]
  },
  {
    title: 'Returns & Refunds',
    icon: RefreshCw,
    faqs: [
      {
        question: 'What is your return policy?',
        answer: 'We offer a 7-day easy return policy from the date of delivery. Products must be unused, unwashed, and in their original packaging with all tags attached. Some items like customized products and innerwear are not eligible for return.'
      },
      {
        question: 'How do I initiate a return?',
        answer: 'To initiate a return, log into your account, go to "My Orders", select the order, and click on "Return Item". Choose the reason for return and schedule a pickup. Our team will collect the product from your doorstep.'
      },
      {
        question: 'When will I receive my refund?',
        answer: 'Once we receive and inspect the returned item, refunds are processed within 5-7 business days. The amount will be credited to your original payment method. For COD orders, refunds are processed to your bank account.'
      },
      {
        question: 'Can I exchange a product instead of returning it?',
        answer: 'Yes, exchanges are available for size and color variations subject to stock availability. Initiate an exchange request from "My Orders" section. The replacement will be shipped once we receive the original product.'
      },
      {
        question: 'What if I receive a damaged or defective product?',
        answer: 'We sincerely apologize if you received a damaged item. Please contact us within 48 hours of delivery with photos of the damage. We will arrange a free return pickup and send a replacement or full refund immediately.'
      }
    ]
  },
  {
    title: 'Products & Sizing',
    icon: Ruler,
    faqs: [
      {
        question: 'How do I choose the right size?',
        answer: 'Each product page has a detailed size guide with measurements. We recommend measuring yourself and comparing with our size chart for the best fit. If you are between sizes, we generally recommend going one size up for comfort.'
      },
      {
        question: 'Are the product colors accurate in the photos?',
        answer: 'We make every effort to display colors as accurately as possible. However, actual colors may vary slightly due to monitor settings, lighting during photography, and fabric textures. The product description mentions the exact color name for reference.'
      },
      {
        question: 'What is the fabric quality of your sarees?',
        answer: 'We source premium quality fabrics directly from weavers and trusted manufacturers. Each product description includes detailed fabric composition, weave type, and care instructions. Our sarees are known for their durability and comfort.'
      },
      {
        question: 'Do your sarees come with a blouse piece?',
        answer: 'Yes, most of our sarees come with an unstitched blouse piece (0.8-1 meter) unless otherwise mentioned in the product description. The blouse fabric matches or complements the saree design.'
      },
      {
        question: 'Can I request customization or alterations?',
        answer: 'Currently, we offer ready-to-wear products without customization options. However, we are working on introducing custom blouse stitching services soon. Stay tuned for updates!'
      }
    ]
  },
  {
    title: 'Account & General',
    icon: Package,
    faqs: [
      {
        question: 'How do I create an account?',
        answer: 'Click on the "Sign In" button at the top of the page and select "Create Account". You can register using your email address or sign up quickly using your Google account. Creating an account helps you track orders, save addresses, and access exclusive offers.'
      },
      {
        question: 'I forgot my password. How can I reset it?',
        answer: 'Click on "Sign In", then select "Forgot Password". Enter your registered email address, and we will send you a password reset link. Follow the link to create a new password. The link expires in 24 hours for security.'
      },
      {
        question: 'How do I apply a coupon or discount code?',
        answer: 'During checkout, you will find a "Apply Coupon" field. Enter your coupon code and click "Apply". The discount will be reflected in your order total. Only one coupon can be used per order, and some coupons have minimum purchase requirements.'
      },
      {
        question: 'Do you have a loyalty or rewards program?',
        answer: 'Yes! Our Saakie Rewards program lets you earn points on every purchase. Points can be redeemed for discounts on future orders. You automatically become a member when you create an account. Check your account dashboard for your current points balance.'
      },
      {
        question: 'How can I unsubscribe from promotional emails?',
        answer: 'You can unsubscribe by clicking the "Unsubscribe" link at the bottom of any promotional email. Alternatively, go to your account settings and manage your email preferences. Note that you will still receive important order-related emails.'
      }
    ]
  }
]

function FAQAccordion({ faq, isOpen, onToggle }: { faq: FAQItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full py-5 flex items-center justify-between text-left hover:text-rose-600 transition-colors"
      >
        <span className="font-medium text-gray-900 pr-4">{faq.question}</span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-rose-600 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="pb-5 pr-8">
          <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
        </div>
      )}
    </div>
  )
}

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState('')

  const toggleItem = (categoryIndex: number, faqIndex: number) => {
    const key = `${categoryIndex}-${faqIndex}`
    setOpenItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const filteredFAQs = faqData.map(category => ({
    ...category,
    faqs: category.faqs.filter(
      faq =>
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.faqs.length > 0)

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 py-16 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Find answers to common questions about orders, shipping, returns, and more
            </p>

            {/* Search Bar */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search for answers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-full border border-gray-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition-all"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            {filteredFAQs.length > 0 ? (
              <div className="space-y-12">
                {filteredFAQs.map((category, categoryIndex) => {
                  const Icon = category.icon
                  return (
                    <div key={category.title}>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
                          <Icon className="w-5 h-5 text-rose-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">{category.title}</h2>
                      </div>
                      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200 px-6">
                        {category.faqs.map((faq, faqIndex) => (
                          <FAQAccordion
                            key={faqIndex}
                            faq={faq}
                            isOpen={openItems[`${categoryIndex}-${faqIndex}`] || false}
                            onToggle={() => toggleItem(categoryIndex, faqIndex)}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No results found for &ldquo;{searchQuery}&rdquo;</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-4 text-rose-600 hover:text-rose-700 font-medium"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Still Need Help Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <Phone className="w-12 h-12 text-rose-600 mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Still have questions?
            </h2>
            <p className="text-gray-600 mb-8">
              Can&apos;t find the answer you&apos;re looking for? Our customer support team is here to help!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center px-6 py-3 bg-rose-600 text-white font-medium rounded-lg hover:bg-rose-700 transition-colors"
              >
                Contact Us
              </Link>
              <a
                href="mailto:support@saakie-byknk.com"
                className="inline-flex items-center justify-center px-6 py-3 bg-white text-gray-900 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Email Support
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
