import { Header } from '@/components/layout/header'
import { HeroSection } from '@/components/home/hero-section'
import { BestDealBanner } from '@/components/home/best-deal-banner'
import { CategoryGrid } from '@/components/home/category-grid'
import { FeaturedProducts } from '@/components/home/featured-products'
import { NewArrivals } from '@/components/home/new-arrivals'
import { CategoryShelves } from '@/components/home/category-shelves'
import { requestDevice } from '@/lib/server/device'
import {
  loadHeroSlides,
  heroSlideSets,
  loadBestDeal,
  loadCategoryCards,
  loadFeaturedProducts,
  loadNewArrivals,
  loadCategoryShelves,
} from '@/lib/server/storefront'

// Rendered per request on the server. The data comes from the tagged cache
// (lib/server/cache.ts), so a request costs no database round trip until an
// admin changes something; `force-dynamic` keeps `next build` from needing a
// database to prerender this page.
export const dynamic = 'force-dynamic'

/**
 * Home page. Every section's data is loaded here and passed down as props,
 * so the first HTML already contains the hero image (with `priority`), the
 * category cards and the featured products. The sections used to fetch in
 * `useEffect` after hydration, which meant a loading state and eight
 * requests before anything meaningful was on screen.
 *
 * One failing section must not take the page down: each load is settled
 * independently and falls back to an empty list.
 */
export default async function HomePage() {
  // Laptop or phone, from the request headers: picks which hero slide set
  // goes into the first HTML (the component re-checks against the viewport).
  const device = await requestDevice()

  const [slides, newArrivals, bestDeal, categories, shelves, featured] = await Promise.allSettled([
    loadHeroSlides(),
    loadNewArrivals(),
    loadBestDeal(),
    loadCategoryCards(),
    loadCategoryShelves(),
    loadFeaturedProducts(),
  ])

  const settled = <T,>(result: PromiseSettledResult<T>, fallback: T, label: string): T => {
    if (result.status === 'fulfilled') return result.value
    console.error(`[home] ${label} failed:`, result.reason)
    return fallback
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection slides={heroSlideSets(settled(slides, [], 'hero slides'))} initialDevice={device} />
        {/* Omitted entirely (no heading) when nothing was added in the last two weeks. */}
        <NewArrivals products={settled(newArrivals, [], 'new arrivals')} />
        {/* The single biggest discount, its photo behind a dark wash. Hidden when nothing is on sale. */}
        <BestDealBanner deal={settled(bestDeal, null, 'best deal')} />
        <CategoryGrid categories={settled(categories, [], 'categories')} />
        {/* Every category's latest sarees, under a "— NAME ———" rule heading. */}
        <CategoryShelves shelves={settled(shelves, [], 'category shelves')} />
        <FeaturedProducts products={settled(featured, [], 'featured products')} />
      </main>
    </div>
  )
}
