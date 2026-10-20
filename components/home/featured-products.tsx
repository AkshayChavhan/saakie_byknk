'use client'

import { ProductShelf, type ProductShelfCard } from '@/components/home/product-shelf'

export type FeaturedProductCard = ProductShelfCard

interface FeaturedProductsProps {
  /** Featured products loaded on the server (app/page.tsx). */
  products: FeaturedProductCard[]
}

/** Home page "Featured Products" shelf. Hidden entirely when nothing is featured. */
export function FeaturedProducts({ products }: FeaturedProductsProps) {
  return (
    <ProductShelf
      title="Featured Products"
      subtitle="Handpicked sarees for the discerning woman"
      viewAllHref="/products"
      viewAllLabel="View All Products"
      products={products}
    />
  )
}
