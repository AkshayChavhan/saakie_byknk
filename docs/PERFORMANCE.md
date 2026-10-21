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
| `/products/[slug]` and `GET /api/products/[slug]` (`loadProductDetail`, per slug) | `products`, `categories` | admin product writes, payment settlement, review moderation, category writes |
| `GET /api/products` (`loadCatalogue`: every active product; the shop listing filters, sorts and pages it in memory) | `products`, `categories` | admin product and category writes, payment settlement, review moderation |
| `GET /api/search/suggest` (`loadSearchIndex`: every active saree and category, filtered in memory per keystroke) | `products`, `categories` | admin product and category writes, payment settlement, review moderation |
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

# Performance notes (frontend)

## Server-rendered pages

Pages that used to render an empty shell and fetch in `useEffect` now load
their data in the server component and pass it as props:

| Page | Loader | What the client gets |
|---|---|---|
| `/` | `lib/server/storefront.ts` (`loadHeroSlides`, `loadBestDeal`, `loadCategoryCards`, `loadFeaturedProducts`) | all four sections as props; the hero image is in the first HTML with `priority` |
| `/products/[slug]` | `lib/server/products.ts` `loadProductDetail` | `initialProduct`; tagged cache per slug, so a repeat view reads no database; metadata, JSON-LD and the body share one lookup via React `cache()` |
| `/categories/[slug]` | `lib/server/categories.ts` `loadCategoryDetail` | `initialCategory`; the listing request starts immediately |
| `/cart` | `lib/server/cart.ts` `loadCart` | `initialCart` |
| `/checkout` | cart + addresses + settings in `app/checkout/page.tsx` | `initial` for `CheckoutView` |
| `/wishlist` | `lib/server/wishlist.ts` `loadWishlistItems` | `initialItems` for `WishlistView` |

The public API routes call the same loaders, so a client-side refresh (for
example after posting a review) returns the same shape. Pages that render
per-visitor data are `force-dynamic`; the home page is too, so `next build`
never needs a database, and its data comes from the tagged cache.

Props are passed through `JSON.parse(JSON.stringify(...))` so Dates reach the
client as strings, matching the API responses the components were written for.

## Hero carousel

Only the visible slide and the next one carry an `<Image>`; `priority` is on
the first slide while it is on screen, the next slide loads lazily. The rest
of the slides are in the DOM without an image until the carousel reaches them.

## Typed filters

`hooks/use-debounced-value.ts` delays a value until it stops changing for
300 ms. The products page, the category page and the admin tables feed the
debounced search and price values into their fetch dependencies, keep an
`AbortController` per request so a superseded response is discarded, and
keep the current rows on screen (dimmed, `aria-busy`) during a refetch so
inputs are never unmounted mid-typing.

## Shared profile query

`useSession()` and `useProfile()` in `lib/auth-client.ts` share one React
Query entry keyed by the Clerk user id, so the header and the account page
make one `/api/users/profile` request between them. `update()` patches that
cache (name, photo, phone) after a profile edit.

## Admin tables

`GET /api/admin/products` and `GET /api/admin/users` accept `search`, `page`,
`limit`, and `category`/`status` or `role`, and return `pagination` and
`stats` (catalogue- or directory-wide counts for the summary cards). The
pages no longer filter or count the rows they happen to have loaded. The
toast context value is memoised, so listing `toast` in a fetch callback's
dependencies no longer refetches on every toast.

## Bundle

The chat bubble is loaded with `next/dynamic` (`ssr: false`) from
`components/providers.tsx`, and it loads `ChatWindow` the same way on first
open, so neither ships with routes that never show them. The four static
content pages (about, our story, care instructions, shipping and returns)
are server components.

## Service worker and images

`app/sw.ts` never caches Clerk or payment-gateway responses, nor navigations
to account, cart, checkout, admin, wishlist or the auth pages (rules in
`lib/sw-rules.ts`). Cloudinary responses are cached only with status 200;
opaque responses cost several megabytes of quota each. `signOut()` deletes
the per-visitor `pages` cache.

Images are resized by their own CDN, never by this server. `next.config.mjs`
sets a custom loader (`lib/image-loader.ts`): a Cloudinary photo's URL gets
`c_limit,w_<width>` before any existing step (the watermark, so it scales
with the resized photo) and `f_auto,q_auto:eco` after it, so the browser
downloads the right size in WebP/AVIF straight from Cloudinary. "eco" is
about 30% lighter than Cloudinary's default "good"; uploaded hero banners
(`/hero-slides/`) keep `q_auto` ("good") so the full-width artwork stays crisp. Unsplash and
Pexels demo photos and Clerk profile photos use their host's own width
parameter; the two small files in `/public` are served as they are. Nothing
goes through `/_next/image` any more. These cross-origin images reach the
service worker as opaque responses, so it leaves them to the browser's HTTP
cache, which Cloudinary fills for 30 days.
