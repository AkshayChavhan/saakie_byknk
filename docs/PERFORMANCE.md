# Performance notes (server and database)

What keeps the API fast. Companion to `docs/RELIABILITY.md`.

## Indexes

Prisma does not index relation fields on MongoDB, so every `include` used to
scan the related collection. `prisma/schema.prisma` now indexes:

| Model | Index | Serves |
|---|---|---|
| Image, Color, Size, Variant | `productId` | every product `include` |
| CartItem, WishlistItem | `productId` (plus the unique pair) | cart and wishlist loads |
| OrderItem | `orderId`, `productId` | order detail, "has orders" checks |
| Address | `userId` | address book |
| Category | `parentId`, `(isActive, parentId)` | category tree |
| Product | `(isActive, createdAt)`, `(isActive, isFeatured, createdAt)`, `(isActive, salesCount)`, `(isActive, rating)` | listings, featured strip, sorts |
| Order | `gatewayOrderId`, `paymentId`, `status`, `createdAt` | settlement, refunds, dashboard |
| Review | `(productId, status)` | approved-review counts |

Apply with `npm run prisma:push`.

## Maintained counters: `salesCount` and `rating`

Listings used to sort "popular" by counting order items across every matching
product, and every page averaged reviews per request. Both numbers now live on
the product:

- `Product.salesCount` is incremented by payment settlement
  (`lib/server/payments.ts`), in the same write that decrements stock.
- `Product.rating` is recomputed by `syncProductRating()` in
  `lib/server/reviews.ts` whenever an admin approves, un-approves or deletes a
  review.

The product list, the featured strip, the product page, its SEO metadata, the
hero fallback and the dashboard's top products all read these fields. On a
database that predates this, run the backfill once:

```bash
node scripts/backfill-product-stats.mjs           # report
node scripts/backfill-product-stats.mjs --apply   # write
```

Until it runs, existing products sort as if they had no sales and no rating.

## Tagged cache

`lib/server/cache.ts` wraps reads in Next's data cache under tags, and admin
writes invalidate the tags, so an edit shows on the next request. Every entry
also has a time-based fallback (5 min, settings 60 s) in case a write path is
missed.

| Read | Tags | Invalidated by |
|---|---|---|
| `GET /api/categories`, `GET /api/categories/nav`, category tree and counts | `categories`, `products` | admin category and product writes |
| `GET /api/hero-slides` | `hero-slides`, `products` | admin hero slide writes, product writes |
| `GET /api/promotional-data` | `promotional-banners` | admin banner writes |
| `GET /api/products/featured` | `products` | product writes, payment settlement, review moderation |
| `getStoreSettings()` | `settings` | `PATCH /api/admin/settings` |

Under Vitest the wrapper is a pass-through so tests see every query.

## Cart badge

The header badge is mounted on every page and used to download the whole
cart. `GET /api/cart/count` returns `{ itemCount }` from one aggregate, and
`cartApi.count()` is what the badge calls. The cart and wishlist endpoints
themselves now `select` the fields their pages render (name, slug, price,
stock, one thumbnail) instead of whole product documents, which also keeps
`costPrice` off the wire.

## Parallel reads

Independent queries run in one `Promise.all` instead of one after another:
the product list's count and page, create-intent's address check, cart and
settings, and all eleven dashboard reads. The dashboard's revenue figures are
database sums (`aggregate`), and active users is a `$group` count, so no
order rows are loaded to add them up in JavaScript.
