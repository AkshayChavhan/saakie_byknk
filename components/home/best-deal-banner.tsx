import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Tag } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { BestDeal } from '@/lib/server/storefront'

interface BestDealBannerProps {
  /** The biggest markdown in the shop (app/page.tsx); null hides the banner. */
  deal: BestDeal | null
}

/**
 * Full-width banner for the saree with the biggest discount. Its photo is
 * the background, under a dark wash that is strongest behind the text (the
 * left on wide screens, the bottom on phones) so the white text always reads.
 */
export function BestDealBanner({ deal }: BestDealBannerProps) {
  if (!deal) return null

  return (
    <section className="py-10" aria-labelledby="best-deal-heading">
      <div className="container mx-auto px-4">
        <div className="relative isolate overflow-hidden rounded-2xl bg-gray-900">
          {deal.image && (
            <Image
              src={deal.image}
              alt=""
              fill
              sizes="(min-width: 1280px) 1216px, 100vw"
              className="-z-10 object-cover"
            />
          )}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/60 to-black/30 sm:bg-gradient-to-r sm:from-black/85 sm:via-black/55 sm:to-black/10"
          />

          <div className="flex min-h-[18rem] max-w-xl flex-col justify-end gap-3 p-6 text-white sm:min-h-[22rem] sm:justify-center sm:p-10">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium uppercase tracking-wider backdrop-blur-sm">
              <Tag size={14} aria-hidden="true" />
              Biggest deal
            </span>
            <h2 id="best-deal-heading" className="text-4xl font-bold leading-none sm:text-6xl">
              {deal.discount}% OFF
            </h2>
            <p className="text-lg font-medium sm:text-2xl">{deal.name}</p>
            <p className="flex items-baseline gap-3">
              <span className="text-xl font-semibold">{formatPrice(deal.price)}</span>
              <span className="text-white/70 line-through">{formatPrice(deal.comparePrice)}</span>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link
                href={`/products/${deal.slug}`}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-100"
              >
                Shop this deal
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              {deal.saleCount > 1 && (
                <Link
                  href="/products?sale=true"
                  className="text-sm font-medium text-white/90 underline-offset-4 hover:underline"
                >
                  See all {deal.saleCount} sarees on sale
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
