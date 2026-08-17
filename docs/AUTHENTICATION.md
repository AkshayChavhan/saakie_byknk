# Authentication Flow

The app uses **Auth.js (NextAuth v5)** with the **Credentials provider** for
email + password login, plus **signup email verification**. Sessions are **JWTs
stored in a browser cookie** — there is **no session table in the database**.

> **Key point:** No session token is saved in the DB. The database stores the
> user (with a bcrypt password hash) and, transiently, hashed email-verification
> tokens. The session "token" is a signed/encrypted JWT that lives in an
> httpOnly cookie in the browser.

---

## 1. Signup flow (with email verification)

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
        │       └── emailVerified starts as null → account cannot sign in yet
        │  5. prisma.cart.create()  +  prisma.wishlist.create()
        │  6. createVerificationToken(email)      ── lib/server/verification.ts
        │       raw 32-byte token → SHA-256 hash stored in `verification_tokens`
        │       (24 h expiry; previous tokens for the address replaced)
        │  7. sendVerificationEmail()             ── lib/server/email.ts
        │       nodemailer → SMTP (Resend) → inbox
        │       (send failure is logged, NOT fatal — resend covers it)
        ▼
   201 { success: true, requiresVerification: true, user }
        │
        ▼  (back in sign-up page)
   "Check your email" screen — NO auto-login. The user must click the
   emailed link before they can sign in. A "Resend email" button calls
   POST /api/auth/resend-verification.
```

**Stored in the DB:** the user document (`password` as a **bcrypt hash**,
`emailVerified: null`) and one `verification_tokens` document holding the
**SHA-256 hash** of the link token — never the raw token, so a DB leak cannot
be replayed into working links.

---

## 2. Email confirmation flow

```
User clicks the emailed link
        │
        ▼
GET /auth/confirm?token=<raw>          app/auth/confirm/route.ts
        │  1. verifyToken(raw)              ── lib/server/verification.ts
        │       SHA-256(raw) → prisma.verificationToken.findUnique
        │       unknown or expired? → redirect /sign-in?error=confirmation_failed
        │  2. prisma.user.updateMany({ email }, { emailVerified: now })
        ▼
   redirect → /sign-in?verified=1   (green "email confirmed" banner)
```

Design notes:

- The link stays **valid until it expires (24 h)** — it is *not* single-use.
  Corporate mail scanners (Outlook SafeLinks etc.) prefetch links before the
  human clicks; a single-use token would be burned by the scanner. Verifying an
  email is idempotent and low-privilege, so multi-use within the TTL is the
  safer trade-off.
- Issuing a new token (signup or resend) replaces any previous tokens for the
  address; expired rows are cleared opportunistically.
- `/auth/confirm` is listed under the public `'/auth'` prefix in
  `middleware.ts` so the link works while signed out.

---

## 3. Login flow

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
        │     invalid? return null  → login rejected (generic error)
        │  3. user.emailVerified null?  →  throw EmailNotVerifiedError
        │       (CredentialsSignin subclass, code: 'email_not_verified' —
        │        checked ONLY after the password matches, so a wrong-password
        │        attempt cannot probe verification status)
        │  4. verified?  return { id, email, name, image, role }
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

On the client, `signIn(..., { redirect: false })` returns
`{ error, code, ... }`. The sign-in page treats `code === 'email_not_verified'`
specially: it shows "your email has not been confirmed yet" plus a **resend
button** instead of the generic "invalid email or password".

The "token" is a **JWT stored as an httpOnly cookie**, not a DB row.
`AUTH_SECRET` is the key used to sign/encrypt it.

---

## 4. Resending the verification email

`POST /api/auth/resend-verification { email }`
(app/api/auth/resend-verification/route.ts)

- Rate-limited: **5 requests / 15 min per IP** (`lib/server/rate-limit.ts`)
  plus a **60 s per-email cooldown** on freshly issued tokens.
- Always answers with the **same generic success body**, whether or not an
  account exists — the endpoint cannot be used to probe which emails are
  registered.
- Only actually sends when the account exists **and** is still unverified.
- Reachable from the sign-up "check your email" screen and from the sign-in
  page after an `email_not_verified` error or a failed confirmation link.

---

## 5. Using the session on later requests

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

## Why no session token is stored in the DB

| | JWT strategy (what we use) | DB-session strategy (alternative) |
|---|---|---|
| Where the session lives | Encrypted cookie in browser | A `Session` row in MongoDB |
| DB lookup for the session | None | Yes, every request |
| Extra tables needed | `VerificationToken` only (email verification) | `Session`, `Account`, `VerificationToken` |
| Why this choice | Auth.js v5's **Credentials provider requires the JWT strategy** — DB sessions are not supported with it |

The DB stays minimal — the `users` collection plus the small
`verification_tokens` collection. The `VerificationToken` model is shaped like
the Auth.js adapter's, so when Google login or magic links are added later the
adapter can take it over (a comment marks the spot in `prisma/schema.prisma`).

---

## One-line summary

```
SIGNUP → /api/auth/register → bcrypt.hash → user (unverified) + emailed link
CONFIRM→ /auth/confirm?token → SHA-256 lookup → emailVerified stamped
LOGIN  → authorize() → bcrypt.compare → emailVerified gate → signed JWT cookie
```

The DB stores the **user + password hash** (+ hashed verification tokens).
The **session token is a cookie**, never persisted server-side.

---

## Key files

| File | Role |
|---|---|
| `auth.config.ts` | Edge-safe config — `pages`, `session` strategy, `jwt`/`session` callbacks. Imported by middleware. No Prisma/bcrypt. |
| `auth.ts` | Full Node config — Credentials provider with bcrypt + Prisma, `EmailNotVerifiedError` gate. Exports `handlers`, `auth`, `signIn`, `signOut`. |
| `app/api/auth/[...nextauth]/route.ts` | Auth.js HTTP handlers (sign-in, callback, session, csrf, …). |
| `app/api/auth/register/route.ts` | Email/password signup — hashes the password, creates User + Cart + Wishlist, issues the verification token, sends the email. |
| `app/api/auth/resend-verification/route.ts` | Re-sends the confirmation link (rate-limited, enumeration-safe). |
| `app/auth/confirm/route.ts` | Email-confirmation callback — verifies the token, stamps `emailVerified`, redirects to `/sign-in`. |
| `lib/server/verification.ts` | Token create/verify helpers (SHA-256 at rest, 24 h TTL, link building). |
| `lib/server/email.ts` | Nodemailer SMTP sender. No SMTP configured → dev logs the link to the console instead. |
| `middleware.ts` | Route protection — redirects unauthenticated users; gates `/admin`; `'/auth'` prefix public for the confirm link. |
| `lib/server/auth.ts` | `requireAuth()` / `optionalAuth()` / `requireAdmin()` / `requireSuperAdmin()` for API routes. |
| `types/next-auth.d.ts` | Adds `id` and `role` to the session/JWT TypeScript types. |
| `prisma/schema.prisma` | `User` model — `password` (bcrypt hash), `emailVerified`; `VerificationToken` model. |
| `scripts/backfill-email-verified.mjs` | One-time migration: stamps `emailVerified` on accounts created before this feature (already run on the main DB). |

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
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `EMAIL_FROM` —
  verification-email delivery over SMTP (Resend in production — see
  [RESEND.md](RESEND.md)). With `SMTP_HOST` unset, development prints the
  verification link to the server console instead of sending mail.
- `NEXT_PUBLIC_APP_URL` — the origin baked into emailed confirmation links.
  Must match where the app actually runs (`http://localhost:3001` locally,
  `https://saakiebyknk.in` in production).

## Future providers

Google OAuth and magic-link sign-in can be added later by dropping a provider
into the `providers` array in `auth.ts`. Extension points are marked with
comments in `auth.ts`, `auth.config.ts`, and the sign-in / sign-up pages.
Magic-link additionally needs the Auth.js adapter models in `schema.prisma`
(the existing `VerificationToken` model is already adapter-shaped).
