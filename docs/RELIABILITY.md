# Reliability notes

What keeps orders, stock and the admin API correct under retries, races and
bad input. Companion to `docs/API-FLOW.md`.

## Payment settlement

Every payment outcome is applied through one module, `lib/server/payments.ts`.

| Caller | Event | Function |
|---|---|---|
| `POST /api/payments/confirm` | Razorpay checkout modal succeeded (client) | `settlePaidOrder` |
| `POST /api/webhooks/razorpay` | `payment.captured` / `payment.failed` / `refund.created` | `settlePaidOrder` / `settleFailedPayment` / `settleRefund` |
| `POST /api/webhooks/stripe` | `payment_intent.succeeded` / `payment_intent.payment_failed` / `charge.refunded` | same |

### Why it is idempotent

Razorpay and Stripe redeliver any event that does not get a 2xx, the customer
can refresh the confirmation page, and the confirm route and the webhook race
each other on every order. `settlePaidOrder` therefore:

1. Claims the order with one conditional `updateMany` guarded on the payment
   status being `PENDING`, `FAILED` or `CANCELLED`. A declined first attempt
   followed by a successful retry is normal Razorpay behaviour, so those are
   claimable; `PAID` and `REFUNDED` orders are never touched.
2. If the claim changed zero rows, returns `applied: false` and does nothing
   else. This is the redelivery / second-caller path.
3. Otherwise, inside the same transaction: deletes only the bought product
   lines from the cart, and decrements stock per item with
   `where: { stock: { gte: quantity } }`. If that matches nothing the product
   is floored at 0 and the order's `notes` gets an `OVERSOLD: …` line for
   admin to resolve.

`settleFailedPayment` only moves `PENDING` orders, so a late failure event
cannot undo a capture. `settleRefund` only moves `PAID` orders, and a refund
smaller than the order total is written to `notes` as `PARTIAL REFUND` rather
than marking the order refunded. Refunds do not restock.

Unknown ids are acknowledged with 200 so the gateway stops retrying an event
that will never match anything.

### Replay protection on the confirm route

The Razorpay checkout signature proves that Razorpay saw payment P for
Razorpay order R. It says nothing about which *store* order the client names.
`POST /api/payments/create-intent` therefore stamps `Order.gatewayOrderId`
with R, and the confirm route refuses unless the signed `razorpay_order_id`
equals the store order's `gatewayOrderId`. Orders created before the column
existed have no stamp and are refused too.

### Orphan orders

The order row is written before the gateway is called. If the gateway call
fails the row is deleted again (`withGatewayOrder` in create-intent), so a
failed or retried checkout click does not leave a `PENDING` order behind.

## Unique indexes

| Model | Key | Route behaviour |
|---|---|---|
| `CartItem` | `(cartId, productId)` | `POST /api/cart` upserts; two simultaneous adds merge into one line |
| `WishlistItem` | `(wishlistId, productId)` | P2002 → 400 "already in wishlist" |
| `Review` | `(userId, productId)` | P2002 → 409 "already reviewed" |

MongoDB refuses to build a unique index over existing duplicates. On a
database that already has data:

```bash
node scripts/dedupe-before-unique-indexes.mjs          # report
node scripts/dedupe-before-unique-indexes.mjs --apply  # merge/remove duplicates
npm run prisma:push
```

Cart duplicates are merged (quantities summed into the oldest line); wishlist
and review duplicates keep the oldest row.

## Address edits and order history

Orders reference the address row they shipped to. `PUT /api/users/addresses/[id]`
on a row any order references detaches that row from the account (as DELETE
already did) and creates a fresh row with the new details, so past orders keep
showing the address they were actually sent to.

## Input validation

`lib/server/validation.ts` holds the zod allow-lists and the query parsers.

- `parseLimit` / `parsePage` clamp `?limit=` to 1–100 and `?page=` to ≥ 1,
  and fall back on non-numeric input instead of producing `NaN`.
- `productUpdateSchema` (admin JSON PATCH), `productCreateSchema`,
  `categoryUpdateSchema`, `cartAddSchema`, `cartQuantitySchema`,
  `wishlistAddSchema`, `userRoleSchema`. Unknown keys are dropped, so a body
  can no longer reach relations through Prisma's nested-write syntax.
- Chat messages are cut at `MAX_CHAT_MESSAGE_CHARS` before they reach the model.

## Admin role changes

`PATCH /api/admin/users/[id]`: nobody changes their own role; granting
`SUPER_ADMIN`, or changing anyone who holds it, needs a `SUPER_ADMIN`; an
`ADMIN` cannot change another `ADMIN`; the last `SUPER_ADMIN` cannot be
demoted. User responses never include the `password` column.

## Rate limiting

`checkRateLimit(key, limit, windowMs)` in `lib/server/rate-limit.ts`. With
`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` set it counts in
Upstash (one `INCR` + `PEXPIRE NX` pipeline per hit), shared by every
serverless instance. Without them, or if Upstash is unreachable, it falls back
to the in-process limiter, which only throttles a client hammering one
instance. Applied to `/api/chat` and `/api/payments/confirm`.

## Error responses

`apiError()` returns `"Internal server error"` for unexpected errors outside
development. The real message and stack still go to the server log.

## Environment check

`instrumentation.ts` runs `assertEnv()` once per server start.
`DATABASE_URL`, the two Clerk keys and `NEXT_PUBLIC_APP_URL` are required and
throw in production (never during `next build`). Partially configured
integrations (for example a Razorpay key id without the secret) log a
warning naming the missing variables; fully absent ones are listed as off.

## External calls

Instagram fetches abort after 8 s, Cloudinary uploads after 60 s, and the
Anthropic client uses a 20 s timeout with one retry so a slow call fails
cleanly inside the chat route's 30 s function limit. Cloudinary deletes for
removed product images run after the product transaction commits, and fresh
uploads are cleaned up if the commit fails.

## CI

`.github/workflows/ci.yml` runs lint, `vitest run` and `next build` on every
pull request and on pushes to `main`, with placeholder Clerk and database
values so the build never contacts a real service.
