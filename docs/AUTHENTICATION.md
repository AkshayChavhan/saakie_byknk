# Authentication Flow

The app uses **Auth.js (NextAuth v5)** with the **Credentials provider** for
email + password login. Sessions are **JWTs stored in a browser cookie** — there
is **no session table in the database**.

> **Key point:** No token is saved in the DB. The database stores the user (with
> a bcrypt password hash). The session "token" is a signed/encrypted JWT that
> lives in an httpOnly cookie in the browser.

---

## 1. Signup flow

```
User fills /sign-up form
        │
        ▼
app/(auth)/sign-up/page.tsx  →  handleSubmit()
        │  fetch POST /api/auth/register  { name, email, password }
        ▼
app/api/auth/register/route.ts  →  POST()
        │  1. validate email regex + password length ≥ 8
        │  2. prisma.user.findUnique({ email })   ── already exists? → 409
        │  3. bcrypt.hash(password, 12)           ── hash the password
        │  4. prisma.user.create({ email, name, password: hash, role: 'USER' })
        │  5. prisma.cart.create()  +  prisma.wishlist.create()
        ▼
   MongoDB `users` collection   ←── ONLY the user row is saved here
   { _id, email, name, password: "$2a$12$...", role: "USER" }
        │
        ▼  (back in sign-up page, on 201 success)
signIn('credentials', { email, password })  ── auto-login, see flow #2
```

**Stored in the DB:** the user document, with `password` as a **bcrypt hash**
(never plaintext). Nothing else — no token, no session row.

---

## 2. Login flow (also runs automatically right after signup)

```
signIn('credentials', { email, password })   [next-auth/react]
        │
        ▼
POST /api/auth/callback/credentials
        │  handled by app/api/auth/[...nextauth]/route.ts
        │  (re-exports `handlers` from auth.ts)
        ▼
auth.ts  →  Credentials provider  →  authorize({ email, password })
        │  1. prisma.user.findUnique({ email })   ── includes password hash
        │  2. bcrypt.compare(password, user.password)   ── verify
        │  3. valid?   return { id, email, name, image, role }
        │     invalid? return null  → login rejected
        ▼
auth.config.ts  →  callbacks.jwt({ token, user })
        │  on first login (`user` is set):
        │    token.id   = user.id
        │    token.role = user.role          ←── role baked into the token
        ▼
   JWT is signed + encrypted with AUTH_SECRET
        │
        ▼
   Set-Cookie: authjs.session-token=<encrypted JWT>
   ───────────────────────────────────────────────
   This cookie IS the session. It lives in the BROWSER.
   Nothing is written to the database.
```

The "token" is a **JWT stored as an httpOnly cookie**, not a DB row.
`AUTH_SECRET` is the key used to sign/encrypt it.

---

## 3. Using the session on later requests

The browser automatically sends the session cookie on every same-origin
request. Two consumers:

### Client side — `useSession()`

```
components/layout/header.tsx, app/admin/page.tsx, etc.
  const { data: session } = useSession()
  session.user.role   ←── read straight from the JWT, no DB hit, no API call
```

### Server side — `auth()` in API routes

```
Any protected route, e.g. app/api/cart/route.ts
        │
        ▼
lib/server/auth.ts  →  requireAuth()
        │  1. session = await auth()        ── decrypts the cookie JWT
        │  2. userId  = session.user.id
        │  3. prisma.user.findUnique({ id: userId })   ── fetch fresh user row
        │  4. return AuthedUser   (or a 401 NextResponse)
        ▼
   route proceeds
   (requireAdmin() further checks role for /api/admin/* routes)
```

---

## Why no token is stored in the DB

| | JWT strategy (what we use) | DB-session strategy (alternative) |
|---|---|---|
| Where the session lives | Encrypted cookie in browser | A `Session` row in MongoDB |
| DB lookup for the session | None | Yes, every request |
| Extra tables needed | None | `Session`, `Account`, `VerificationToken` |
| Why this choice | Auth.js v5's **Credentials provider requires the JWT strategy** — DB sessions are not supported with it |

The DB stays minimal — only the `users` collection. When Google login or
magic links are added later, *those* providers need the Auth.js adapter tables
(a comment marks the spot in `prisma/schema.prisma`).

---

## One-line summary

```
SIGNUP → /api/auth/register → bcrypt.hash → prisma.user.create   (user saved to DB)
LOGIN  → authorize() → bcrypt.compare → jwt callback → signed JWT (saved to a COOKIE, not the DB)
```

The DB stores the **user + password hash**.
The **session token is a cookie**, never persisted server-side.

---

## Key files

| File | Role |
|---|---|
| `auth.config.ts` | Edge-safe config — `pages`, `session` strategy, `jwt`/`session` callbacks. Imported by middleware. No Prisma/bcrypt. |
| `auth.ts` | Full Node config — Credentials provider with bcrypt + Prisma. Exports `handlers`, `auth`, `signIn`, `signOut`. |
| `app/api/auth/[...nextauth]/route.ts` | Auth.js HTTP handlers (sign-in, callback, session, csrf, …). |
| `app/api/auth/register/route.ts` | Email/password signup — hashes the password, creates User + Cart + Wishlist. |
| `middleware.ts` | Route protection — redirects unauthenticated users; gates `/admin`. |
| `lib/server/auth.ts` | `requireAuth()` / `optionalAuth()` / `requireAdmin()` / `requireSuperAdmin()` for API routes. |
| `types/next-auth.d.ts` | Adds `id` and `role` to the session/JWT TypeScript types. |
| `prisma/schema.prisma` | `User` model — `password` (bcrypt hash) and `emailVerified` fields. |

## Roles

`USER` (default for new signups) · `ADMIN` · `SUPER_ADMIN`. The role is carried
in the JWT (`session.user.role`). To promote a user, update the `role` field
directly in MongoDB:

```js
db.users.updateOne({ email: 'you@example.com' }, { $set: { role: 'SUPER_ADMIN' } })
```

## Environment

- `AUTH_SECRET` — required. Signs/encrypts the session JWT. Generate with
  `openssl rand -base64 32`. Set a real value in Vercel; the value in
  `.env` / `.env.local` is for local dev only.
- `AUTH_URL` — optional. Auto-inferred on Vercel.

## Future providers

Google OAuth and magic-link sign-in can be added later by dropping a provider
into the `providers` array in `auth.ts`. Extension points are marked with
comments in `auth.ts`, `auth.config.ts`, and the sign-in / sign-up pages.
Magic-link additionally needs the Auth.js adapter models in `schema.prisma`.
