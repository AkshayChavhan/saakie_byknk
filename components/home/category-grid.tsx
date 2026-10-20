'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ChevronLeft, ChevronRight, Folder, Sparkles } from 'lucide-react'
import type { CategoryCard } from '@/lib/server/storefront'

interface CategoryGridProps {
  /** Category cards loaded on the server (app/page.tsx). */
  categories: CategoryCard[]
}

/** Which way the strip can still move; both false while every tile fits. */
interface Overflow {
  left: boolean
  right: boolean
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  const stripRef = useRef<HTMLDivElement>(null)
  const [overflow, setOverflow] = useState<Overflow>({ left: false, right: false })

  // Re-measure on scroll, on resize and whenever the list changes. One pixel
  // of tolerance absorbs sub-pixel rounding at the end of a smooth scroll.
  const measure = useCallback(() => {
    const el = stripRef.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
    setOverflow({
      left: el.scrollLeft > 1,
      right: maxScroll - el.scrollLeft > 1,
    })
  }, [])

  useEffect(() => {
    const el = stripRef.current
    if (!el) return
    measure()
    el.addEventListener('scroll', measure, { passive: true })
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    observer?.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      el.removeEventListener('scroll', measure)
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [measure, categories.length])

  // One click slides a whole set of visible tiles: the step is the widest
  // multiple of one tile pitch (tile + gap) that fits, so no tile is left
  // half-shown at the edge.
  const slide = (direction: -1 | 1) => {
    const el = stripRef.current
    if (!el) return
    const first = el.firstElementChild?.firstElementChild as HTMLElement | null
    const second = first?.nextElementSibling as HTMLElement | null
    const pitch =
      first && second ? second.offsetLeft - first.offsetLeft : first?.offsetWidth || el.clientWidth
    const perPage = Math.max(1, Math.floor(el.clientWidth / pitch))
    el.scrollBy({ left: direction * perPage * pitch, behavior: 'smooth' })
  }

  const hasOverflow = overflow.left || overflow.right

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-b from-gray-50 to-white" aria-labelledby="categories-heading">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 sm:mb-12">
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-secondary-500" aria-hidden="true" />
              <span className="text-sm font-medium text-secondary-600 tracking-wide uppercase">
                Curated Collections
              </span>
            </div>
            <h2
              id="categories-heading"
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-3"
            >
              Shop by Category
            </h2>
            <p className="text-gray-600 max-w-2xl">
              Browse through our handpicked collection of traditional and contemporary sarees
            </p>
          </div>

          {/* View All Categories Link - Enhanced */}
          <Link
            href="/categories"
            className="group inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:text-primary-600 hover:border-primary-200 hover:bg-primary-50 transition-all duration-200 shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 self-center sm:self-auto"
            aria-label="View all categories"
          >
            <span>View All Categories</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-200" aria-hidden="true" />
          </Link>
        </div>

        {categories.length === 0 ? (
          <div className="text-center py-12" role="status" aria-live="polite">
            <div className="bg-white rounded-xl shadow-sm p-8 max-w-md mx-auto border border-gray-100">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <Folder className="h-6 w-6 text-gray-400" aria-hidden="true" />
              </div>
              <p className="text-gray-500">No categories available</p>
            </div>
          </div>
        ) : (
          /*
            A single row of circular tiles, like a story strip: image in a
            thin maroon ring, name beneath. The strip takes the full width of
            the section. While every tile fits it sits centred; once tiles
            overflow it becomes a left-anchored row that scrolls sideways
            (snap per tile, scrollbar hidden) with an arrow on each side that
            slides one set of visible tiles per click. The arrows only appear
            when there is something hidden in that direction.
          */
          <div className="relative">
            {/*
              The maroon ring (ring + offset, 4px) and the hover zoom (5%) are
              painted outside each tile's box, and an overflow container clips
              anything outside its padding box. So the scroll box carries its
              own padding (`px-3 py-3`, pulled back with `-mx-3` so the tiles
              still line up with the heading) and the snap points are offset
              by the same amount (`scroll-px-3`): the first and last circles
              then sit whole at the ends instead of losing their outer edge.
            */}
            <div
              ref={stripRef}
              className="-mx-4 px-4 scroll-px-4 sm:-mx-3 sm:px-3 sm:scroll-px-3 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              role="list"
              aria-label="Product categories"
            >
              {/*
                `w-max min-w-full justify-center`: centred while the tiles fit,
                and a left-anchored scrolling row once they do not. Centring an
                overflowing flex row would clip its first tiles unreachably.
              */}
              <div className="flex w-max min-w-full justify-center gap-5 sm:gap-8 lg:gap-10 py-3 snap-x snap-mandatory">
                {categories.map((category, index) => (
                  <Link
                    key={category.id}
                    href={`/categories/${category.slug}`}
                    className="group flex w-28 sm:w-36 lg:w-44 shrink-0 snap-start flex-col items-center text-center focus:outline-none animate-slide-up"
                    style={{ animationDelay: `${index * 60}ms` }}
                    role="listitem"
                    aria-label={`${category.name} - ${category.count} products`}
                  >
                    <div className="relative aspect-square w-full rounded-full p-[3px] ring-2 ring-maroon-600 ring-offset-2 ring-offset-white transition-transform duration-300 group-hover:scale-105 group-focus-visible:ring-4">
                      <div className="relative h-full w-full overflow-hidden rounded-full bg-gray-100">
                        {category.image ? (
                          <Image
                            src={category.image}
                            alt=""
                            fill
                            sizes="(min-width: 1024px) 176px, (min-width: 640px) 144px, 112px"
                            className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50">
                            <Folder className="h-10 w-10 text-primary-200" aria-hidden="true" />
                          </div>
                        )}
                      </div>
                    </div>
                    <h3 className="mt-3 sm:mt-4 text-sm sm:text-base lg:text-lg font-medium text-gray-900 group-hover:text-maroon-700 transition-colors">
                      {category.name}
                    </h3>
                  </Link>
                ))}
              </div>
            </div>

            {/*
              Slide arrows, vertically centred on the circles (not on the
              strip, whose labels would pull them down). Each is rendered only
              while tiles are hidden on its side.
            */}
            {hasOverflow && overflow.left && (
              <button
                type="button"
                onClick={() => slide(-1)}
                className="absolute left-0 sm:-left-3 lg:-left-5 top-14 sm:top-[4.5rem] lg:top-[5.5rem] -translate-y-1/2 z-10 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white text-gray-800 shadow-md ring-1 ring-gray-200 hover:bg-gray-50 hover:text-maroon-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-maroon-600 transition-colors"
                aria-label="Show previous categories"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
            {hasOverflow && overflow.right && (
              <button
                type="button"
                onClick={() => slide(1)}
                className="absolute right-0 sm:-right-3 lg:-right-5 top-14 sm:top-[4.5rem] lg:top-[5.5rem] -translate-y-1/2 z-10 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white text-gray-800 shadow-md ring-1 ring-gray-200 hover:bg-gray-50 hover:text-maroon-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-maroon-600 transition-colors"
                aria-label="Show more categories"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        {/* Mobile View All Link */}
        {categories.length > 0 && (
          <div className="mt-8 text-center sm:hidden">
            <Link
              href="/categories"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 active:scale-[0.98]"
            >
              <span>View All Categories</span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}