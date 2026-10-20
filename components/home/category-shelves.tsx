'use client'

import { ProductShelf, type ProductShelfCard } from '@/components/home/product-shelf'

export interface CategoryShelf {
  id: string
  name: string
  slug: string
  products: ProductShelfCard[]
}

interface CategoryShelvesProps {
  /** One entry per top-level category that has products, loaded on the server. */
  shelves: CategoryShelf[]
}

/**
 * The home page's category-by-category product rows, right under the
 * "Shop by Category" strip: a "— SILK SAREES ———" rule heading and that
 * category's latest sarees, for every top-level category with stock.
 * Categories without products never appear.
 */
export function CategoryShelves({ shelves }: CategoryShelvesProps) {
  if (shelves.length === 0) return null

  return (
    <div aria-label="Sarees by category">
      {shelves.map((shelf) => (
        <ProductShelf
          key={shelf.id}
          id={`category-${shelf.slug}`}
          variant="rule"
          title={shelfTitle(shelf.name)}
          viewAllHref={`/categories/${shelf.slug}`}
          viewAllLabel={`View all ${shelf.name}`}
          products={shelf.products}
        />
      ))}
    </div>
  )
}

/** "Pure Silk" → "Pure Silk Sarees"; a name that already says sarees is left alone. */
export function shelfTitle(name: string): string {
  return /saree/i.test(name) ? name : `${name} Sarees`
}
