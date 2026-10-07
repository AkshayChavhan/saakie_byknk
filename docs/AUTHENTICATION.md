# Authentication (Clerk)

> **Branch note.** This describes the `clerk-auth-no-merge` branch, which is
> **not to be merged into `main`**. `main` still runs Auth.js. The last Auth.js
> state is commit `dc30340` (local tag `authjs-before-clerk`).

Sign-in is handled by [Clerk](https://clerk.com). The store's own MongoDB
`users` collection is still the main record: it keeps every user's id, role,
cart, wishlist, orders and addresses. Clerk only answers "who is this?".

## What Clerk does and what the store does

| Clerk | The store |
|---|---|
| Sign-up, sign-in, sign-out | The `User` document and its id |
| Email + password, email code (OTP), Google / GitHub | Roles: `USER`, `ADMIN`, `SUPER_ADMIN` |
| Email verification, forgot password | Profile: name, photo, phone |
| New-device email check | Cart, wishlist, orders, addresses, reviews |
| Change password, delete account | Deciding who may see what (`requireAdmin()` etc.) |

Which sign-in methods appear on the form is set in the **Clerk dashboard**, not
in code.

## The two files that know about Clerk

Everything else in the app talks to these two and does not know which provider
is behind them. This is what keeps the way back to Auth.js short.

| File | Side | Contract |
|---|---|---|
| [`auth.ts`](../auth.ts) | Server | `auth()` → `{ user: { id } }` (the **store** user id) or `null` |
| [`lib/auth-client.ts`](../lib/auth-client.ts) | Client | `useSession()` → `{ data, status, update }`, `signOut()` — same shapes as `next-auth/react` |

- API routes keep using `requireAuth()` / `requireAdmin()` from
  [`lib/server/auth.ts`](../lib/server/auth.ts), which is unchanged.
- Components import `useSession` from `@/lib/auth-client`.
- [`middleware.ts`](../middleware.ts) runs `clerkMiddleware` on every page and
  API route. Signed-out visitors are redirected from protected pages to
  `/sign-in?callbackUrl=…`, and from `/admin` to `/`.

## How a Clerk user becomes a store user

Handled by `linkClerkUser()` in
[`lib/server/clerk-users.ts`](../lib/server/clerk-users.ts), which runs on the
first authenticated request (inside `auth()`) and again from the webhook:

1. A store user already has this `clerkId` → use it.
2. A store user has the same email → link it. This is how accounts that
   existed before Clerk keep their orders and their role.
3. Nobody has that email → create the user, with a cart and a wishlist.

Steps 2 and 3 only happen when Clerk has **verified** the email address.
Linking by email hands over an existing account, so an unverified address is
refused.

Because step 3 runs on the first request, sign-up works even if the webhook is
not configured.

## Setup

### 1. Clerk dashboard

1. Create an application at <https://dashboard.clerk.com>.
2. **User & authentication**: turn on Email address, Password, Email
   verification code, and the social connections you want (Google, GitHub —
   up to three on the free plan).
3. Copy the API keys into `.env.local` (below).

### 2. Environment variables

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...   # only needed for the webhook
```

The app does not start without the first two — every page returns an error
until they are set. `AUTH_SECRET` and the `SMTP_*` / `EMAIL_FROM` variables are
no longer read; Clerk sends the verification and reset emails itself.

### 3. Database

`User.clerkId` is new. It is an optional field, so existing documents need no
change, but the lookup index should be created once:

```bash
npm run prisma:push
```

### 4. Webhook (recommended)

Clerk dashboard → **Webhooks** → add endpoint
`https://<your-domain>/api/webhooks/clerk`, subscribe to `user.created`,
`user.updated`, `user.deleted`, and copy the signing secret into
`CLERK_WEBHOOK_SIGNING_SECRET`.

| Event | Effect in the store |
|---|---|
| `user.created` | Same as the first request: link or create the store user |
| `user.updated` | Follow an email change; fill a blank name or photo (never overwrite one) |
| `user.deleted` | Clear `clerkId`. The store user and its orders are kept |

For local testing, expose the dev server with `npm run ngrok`.

### 5. Move existing customers across

```bash
node scripts/clerk-import-users.mjs           # dry run: counts only
node scripts/clerk-import-users.mjs --apply   # create them in Clerk
```

Each account is created in Clerk with its existing bcrypt password hash, so
customers sign in with the password they already have. Accounts whose email was
never confirmed are skipped; those people sign up again and are linked by
email. The Clerk instance that receives them is whichever `CLERK_SECRET_KEY`
points at — run it once per instance.

### 6. Going to production

A production Clerk instance needs a domain you own:

1. In the dashboard, create the production instance and add the DNS records it
   lists (can take up to 48 hours).
2. Create your own Google and GitHub OAuth credentials and enter them in Clerk
   — the shared development credentials do not work in production.
3. Put the `pk_live_` / `sk_live_` keys and the production webhook secret in
   the hosting environment.
4. Run the import script again with the `sk_live_` key.

## Roles

Roles stay in MongoDB (`User.role`). `requireAdmin()` / `requireSuperAdmin()`
read the role from the database on every request, so a role change in
`/admin/users` applies immediately and nothing needs syncing to Clerk.

## Account deletion

- **Admin deletes a user** (`DELETE /api/admin/users/[id]`): the store user is
  removed, then the Clerk user, so the person cannot sign straight back in.
- **Customer deletes their own account** (Account → Security): Clerk removes
  the sign-in and the webhook clears `clerkId`. The store user and order
  history are kept. Erasing those too is a business decision that has not been
  made here.

## Free-plan limits worth knowing

- 50,000 monthly retained users per app
- Sessions fixed at 7 days
- Up to 3 social providers
- "Secured by Clerk" branding on the forms
- No SMS codes, no MFA, no user bans

## Going back to Auth.js

The migration was built to be reversible. MongoDB ids never changed, and the
`password`, `emailVerified` and `VerificationToken` fields were kept.

1. **Export users from Clerk.** Dashboard → Settings → User exports → Export
   users. The CSV includes hashed passwords. Test this early on a development
   instance: it is not confirmed that the export is available on the free plan.

2. **Restore the Auth.js code** from commit `dc30340`:

   ```bash
   git rm -r "app/(auth)" app/api/webhooks/clerk lib/server/clerk-users.ts \
     components/auth/clerk-appearance.ts tests/lib/clerk-users.test.ts
   git checkout dc30340 -- auth.ts auth.config.ts middleware.ts \
     types/next-auth.d.ts "app/(auth)" app/api/auth app/auth \
     lib/server/email.ts lib/server/verification.ts components/auth \
     components/providers.tsx app/layout.tsx \
     tests/setup.tsx tests/middleware-matcher.test.ts
   ```

3. **Point the client seam back.** Replace the body of `lib/auth-client.ts`
   with `export { useSession, signOut } from 'next-auth/react'`, and remove the
   Security button (`openAccountSecurity`) from `app/account/page.tsx`.

4. **Remove the Clerk call** (`deleteClerkUser`) from
   `app/api/admin/users/[id]/route.ts`.

5. **Swap the packages:**

   ```bash
   pnpm remove @clerk/nextjs
   pnpm add next-auth@5.0.0-beta.32 nodemailer@^9.0.5
   pnpm add -D @types/nodemailer@^8.0.1
   ```

6. **Swap the environment variables:** remove the three Clerk ones; set
   `AUTH_SECRET` and the `SMTP_*` / `EMAIL_FROM` set (see `docs/RESEND.md`).

7. **Put the passwords back:**

   ```bash
   node scripts/clerk-export-to-authjs.mjs export.csv                    # dry run
   node scripts/clerk-export-to-authjs.mjs export.csv --apply --unlink
   ```

What going back still costs:

- Everyone is signed out once.
- Customers who only ever used Google, GitHub or the email code have no
  password to restore, and Auth.js here has no "set a password" flow.
- Forgot password, social login, email code and change password disappear
  unless they are built on Auth.js.

## File map

| Path | Purpose |
|---|---|
| `auth.ts` | Server seam: Clerk session → store user id |
| `lib/auth-client.ts` | Client seam: `useSession`, `signOut`, `openAccountSecurity` |
| `lib/server/clerk-users.ts` | Link / create / sync / unlink store users |
| `lib/server/auth.ts` | `requireAuth`, `requireAdmin`, … (provider-agnostic) |
| `middleware.ts` | `clerkMiddleware` + page protection |
| `app/(auth)/sign-in/[[...sign-in]]/page.tsx` | Clerk `<SignIn />` in the branded shell |
| `app/(auth)/sign-up/[[...sign-up]]/page.tsx` | Clerk `<SignUp />` in the branded shell |
| `components/auth/clerk-appearance.ts` | Form styling, `callbackUrl` validation |
| `app/api/webhooks/clerk/route.ts` | Clerk → store user sync |
| `scripts/clerk-import-users.mjs` | Existing customers → Clerk |
| `scripts/clerk-export-to-authjs.mjs` | Clerk passwords → store (return path) |
