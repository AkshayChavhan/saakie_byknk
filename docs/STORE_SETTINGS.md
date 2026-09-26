# Store Settings

Store-wide switches an admin can flip at runtime, without a deploy.

Today there is exactly one: **charge shipping fee**. The page and the plumbing
are built so further switches slot in beside it.

- Admin UI: `/admin/settings` (dashboard → Quick Actions → Store Settings)
- Storage: `store_settings`, one document keyed `default`
- Server helper: `lib/server/settings.ts`
- Shipping maths: `lib/shipping.ts` (shared by browser and server)

---

## The shipping switch

| Toggle | What the customer is charged |
|---|---|
| **On** (default) | ₹99 on orders up to ₹999; free above ₹999 |
| **Off** | ₹0 — every order ships free, whatever the subtotal |

The fee (`SHIPPING_FEE`) and the free-shipping threshold
(`FREE_SHIPPING_THRESHOLD`) are constants in `lib/shipping.ts`. The toggle only
decides whether that rule runs at all.

Switching it off also hides the "Add ₹N more for FREE shipping!" nudge in the
cart — there is nothing to unlock when everything already ships free.

### What it does not touch

Orders that already exist. `Order.shipping` is written once, when the order is
created, so past orders keep the amount they were actually charged. Flipping
the switch never rewrites history or changes what someone already paid.

---

## How it reaches the totals

One function, `calculateShipping(subtotal, itemCount, settings)`, is the only
place the rule lives. Four callers use it:

| Where | Reads the setting via |
|---|---|
| `POST /api/payments/create-intent` | `getStoreSettings()` — **the amount actually charged** |
| `POST /api/orders` | `getStoreSettings()` |
| `app/checkout/page.tsx` | `GET /api/settings` in its initial load |
| `components/cart/cart-summary.tsx` | `useStoreSettings()` |

The two client surfaces are a preview. The server recomputes shipping from the
database on every order and every payment intent, so a customer editing the
page cannot talk the store into free delivery.

Both clients assume **shipping is charged** until the setting loads, so a total
can settle downward to free but never jump upward after render.

---

## Defaults and the first save

`store_settings` starts empty. Until an admin saves something,
`getStoreSettings()` returns `{ shippingEnabled: true }` — exactly the
behaviour the hard-coded rule had before this feature existed. A fresh database
needs no seed, and the first save creates the document via `upsert`.

---

## API

| Route | Auth | Purpose |
|---|---|---|
| `GET /api/settings` | public | `{ shippingEnabled }` — the customer-safe subset, `Cache-Control: no-store` |
| `GET /api/admin/settings` | admin | Full settings, including `updatedAt` |
| `PATCH /api/admin/settings` | admin | `{ shippingEnabled: boolean }` |

`PATCH` type-checks each field, so a stray `"false"` string from a form is
rejected with 400 rather than landing as a truthy "switch on".

---

## Trying it locally

1. `pnpm prisma:push` — creates `store_settings`
2. `pnpm dev`, sign in as an admin, open `/admin/settings`
3. Put something under ₹999 in the cart — the cart and checkout show ₹99
4. Flip **Charge shipping fee** off
5. Reload the cart — shipping reads **FREE**, the nudge is gone, and the total
   drops by ₹99. The Razorpay amount drops with it.
