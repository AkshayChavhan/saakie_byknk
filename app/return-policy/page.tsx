import type { Metadata } from 'next'
import Link from 'next/link'
import { PackageX, Video, Clock, CreditCard, Mail } from 'lucide-react'
import { Header } from '@/components/layout/header'

export const metadata: Metadata = {
  title: 'Return Policy | Saakie by KNK',
  description:
    'Returns at Saakie: damaged items only, reported within 24 hours of delivery with an uncut unboxing video. Approved returns are refunded to the original payment method.',
}

/** The four policy points, rendered as numbered cards below. */
const policyPoints = [
  {
    icon: PackageX,
    title: 'Eligible Returns',
    text: 'We accept returns only for damaged items.',
  },
  {
    icon: Video,
    title: 'Unboxing Video',
    text: 'To process a return, you must provide an unboxing video without cuts for verification.',
  },
  {
    icon: Clock,
    title: 'Return Process',
    text: 'If you receive a damaged item, contact us within 24 hrs of delivery and send the unboxing video.',
  },
  {
    icon: CreditCard,
    title: 'Refunds',
    text: 'Approved returns will be refunded to the original payment method.',
  },
]

export default function ReturnPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="relative overflow-hidden bg-gradient-to-b from-[#fdf8f0] to-white px-5 py-16 sm:py-20">
        {/* Soft saree-tone glows, matching the other informational pages. */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-marigold-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-maroon-200/40 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-2xl">
          {/* Zari rule */}
          <div className="mb-5 flex items-center justify-center gap-2">
            <span className="h-px w-10 bg-gradient-to-r from-transparent to-zari" />
            <span className="text-zari" aria-hidden="true">❖</span>
            <span className="h-px w-10 bg-gradient-to-l from-transparent to-zari" />
          </div>

          <h1 className="text-center font-serif text-3xl font-bold text-maroon-800 sm:text-4xl">
            Return Policy
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-center text-base leading-relaxed text-maroon-700/70">
            At SAAKIE, we want you to be satisfied with your purchase.
            Here&rsquo;s our return policy:
          </p>

          <ol className="mt-10 space-y-4">
            {policyPoints.map((point, index) => {
              const Icon = point.icon
              return (
                <li
                  key={point.title}
                  className="flex gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-maroon-100 sm:p-6"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-maroon-700 to-maroon-600 shadow-md shadow-maroon-900/10">
                    <Icon className="h-6 w-6 text-marigold-100" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="font-serif text-lg font-semibold text-maroon-800">
                      {index + 1}. {point.title}
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed text-maroon-700/70 sm:text-base">
                      {point.text}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>

          <div className="mt-10 text-center">
            <p className="text-base leading-relaxed text-maroon-700/70">
              Thank you for your understanding! If you have any questions, feel
              free to reach out.
            </p>
            <p className="mt-4 font-serif text-maroon-800">
              Best Regards,
              <br />
              Team Saakie
            </p>

            <Link
              href="/contact"
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-maroon-700 to-maroon-600 px-6 py-3 text-sm font-semibold text-marigold-50 shadow-lg shadow-maroon-900/20 transition-all duration-200 hover:from-maroon-800 hover:to-maroon-700 hover:shadow-xl active:scale-[0.99]"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              Contact Us
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
