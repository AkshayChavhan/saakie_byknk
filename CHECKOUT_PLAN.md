# Razorpay Checkout Flow — Implementation Plan

Branch: `feat-razorpay-checkout` (off `indian-cloth-store-saree`)

## Context
Products accept COD + Prepaid (`paymentModes`), but there's no way to pay online.
The Razorpay backend mostly exists (`lib/razorpay.ts`, `/api/payments/create-intent`
creates Razorpay orders, the webhook verifies & confirms), but the **client side
is missing entirely** and the **/checkout page + addresses API don't exist**. The
product page's "Buy Now" is a broken hardcoded COD/QR modal posting to the wrong API.

Goal: a proper **cart → checkout** flow offering COD *and* Pay-Online (Razorpay),
matching the existing cart-based `create-intent` API.

## Decisions (confirmed)
- Build a real **addresses API + form** (saved, reusable).
- **Harden `/api/payments/confirm`** with Razorpay signature verification.
- **Route product-page "Buy Now" through cart → /checkout** (remove the broken COD modal).
- Expose **`NEXT_PUBLIC_RAZORPAY_KEY_ID`** (user adds the value to `.env.local`).

## What exists vs. missing
- ✅ `lib/razorpay.ts`, `/api/payments/create-intent` (cart+address based, creates RZP order with `notes.orderId`), `/api/webhooks/razorpay` (verifies sig, marks PAID, decrements stock, clears cart), `lib/payment.ts` helpers.
- ❌ `/checkout` page, addresses API (`/api/users/addresses`), client Razorpay script + modal, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, signature verify in confirm.

## Build steps

### 1. Expose client key
- `next.config`/env: code reads `process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID`. User pastes the `rzp_test_…` **Key ID** (safe in browser; SECRET stays server-only) into `.env.local`.

### 2. Addresses API — `app/api/users/addresses/route.ts` (NEW)
- `GET` → list current user's addresses (`requireAuth`, ordered default-first).
- `POST` → validate + create an `Address` for the user (name, phone, line1/2, city, state, pincode; first one `isDefault`).
- Matches `lib/api.ts` `userApi.getAddresses/addAddress` (already referenced).

### 3. Harden confirm — `app/api/payments/confirm/route.ts` (MODIFY)
- Accept `{ orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature }`.
- Verify `HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id, RAZORPAY_KEY_SECRET) === razorpay_signature`. Reject (400) on mismatch.
- Only then mark CONFIRMED/PAID. Keep webhook as source of truth (idempotent updates).

### 4. Razorpay client helper — `lib/razorpay-client.ts` (NEW, `'use client'`-safe)
- `loadRazorpayScript()` — inject `https://checkout.razorpay.com/v1/checkout.js` once (promise).
- `openRazorpayCheckout({ key, orderId (rzp), amount, name, prefill, onSuccess, onDismiss })`.

### 5. Checkout page — `app/checkout/page.tsx` (NEW, client)
- Guard: signed-in (else `/sign-in`), cart non-empty (else back to `/cart`).
- Load cart (`cartApi`) + addresses (`userApi`). If no address → inline address form (POST, refetch).
- Order summary (subtotal, shipping = free >₹999 else ₹99, total) reusing the same math as create-intent.
- **Payment options gated by cart items' `paymentModes`** (via `isMethodAllowed` across all items):
  - COD button → POST `create-intent` `{paymentGateway:'cod', shippingAddressId}` → success page.
  - Pay Online → POST `create-intent` `{paymentGateway:'razorpay', shippingAddressId}` → `loadRazorpayScript` → `openRazorpayCheckout` with returned `razorpayOrderId` + `NEXT_PUBLIC_RAZORPAY_KEY_ID` → on success POST `confirm` with the 3 rzp fields → success page.
  - If any cart item disallows a mode, disable that button with a clear note (mirrors server 409).
- On success → `/checkout/success?order=<orderNumber>` (or inline success state) and the account page shows the order.

### 6. Product page — `app/products/[slug]/page.tsx` (MODIFY)
- Replace the broken hardcoded COD/QR "Buy Now" modal: "Buy Now" = add-to-cart then `router.push('/checkout')`; keep "Add to Cart".
- Remove now-dead COD modal state/markup (`handleCashOnDelivery`, `handlePlaceOrder`, QR steps). Keep the `describeModes` label.

### 7. Cart → checkout
- `components/cart/cart-summary.tsx` already links `/checkout` (will now resolve). Verify it passes through.

## Files
**New:** `app/checkout/page.tsx`, `app/api/users/addresses/route.ts`, `lib/razorpay-client.ts`, (optional `app/checkout/success/page.tsx`).
**Modified:** `app/api/payments/confirm/route.ts`, `app/products/[slug]/page.tsx`, `.env.local` (user), README/docs as needed.

## Verification
- `npm run build` + `npm run lint` (Node 20) green.
- Local: `nvm use 20 && npm run dev`; sign in as a demo user; add saree to cart → /checkout.
  - COD path → order created, success, visible on /account.
  - Razorpay path needs HTTPS (Razorpay can't hit localhost): `npm run ngrok`, set the ngrok URL as the dashboard webhook URL, use a Razorpay **test card** → modal → confirm → order PAID; webhook marks captured.
- Confirm signature: a forged confirm call (bad signature) is rejected.
- Payment-mode gating: a PREPAID-only product hides COD and vice-versa.

## Risks / notes
- Razorpay test mode: keys + webhook must all be Test mode; use test cards.
- `NEXT_PUBLIC_RAZORPAY_KEY_ID` must be set or the online button can't open the modal — guard with a friendly message if missing.
- Confirm is the optimistic UI update; the **webhook is authoritative** (already verifies sig, decrements stock, clears cart) — keep both idempotent.
- Stock decrement happens in the webhook; avoid double-decrementing in confirm.
