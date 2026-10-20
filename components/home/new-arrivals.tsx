'use client'

import { ProductShelf, type ProductShelfCard } from '@/components/home/product-shelf'

interface NewArrivalsProps {
  /** Products added in the last two weeks, loaded on the server (app/page.tsx). */
  products: ProductShelfCard[]
}

/**
 * Home page "New Arrivals" shelf, directly under the hero. The server loader
 * (`loadNewArrivals`) already applies the two-week window; when it returns
 * nothing the whole section, title included, stays out of the page.
 *
 * No NEW badge on these cards: everything on this shelf is new by
 * definition, so the badge would repeat the section title on every tile.
 */
export function NewArrivals({ products }: NewArrivalsProps) {
  return (
    <ProductShelf
      title="New Arrivals"
      subtitle=""
      viewAllHref="/products?sort=newest"
      viewAllLabel="View All New Arrivals"
      products={products.map((product) => ({ ...product, isNew: false }))}
    />
  )
}
