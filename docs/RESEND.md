# Saakie — Resend Email Setup

How to send **real signup-verification emails** through
[Resend](https://resend.com) for `saakiebyknk.in`.

**How it fits this app:** unlike a Supabase/Clerk setup, this codebase sends
its own email. On signup, [`app/api/auth/register/route.ts`](../app/api/auth/register/route.ts)
issues a verification token ([`lib/server/verification.ts`](../lib/server/verification.ts))
and hands a branded message to nodemailer
([`lib/server/email.ts`](../lib/server/email.ts)), which speaks plain SMTP.
Resend is just the SMTP provider — any other (Brevo, SES, a Gmail app
password) works by swapping the `SMTP_*` env vars.

```
sign-up → /api/auth/register → token + nodemailer → SMTP → Resend → inbox
inbox click → /auth/confirm?token=… → emailVerified stamped → /sign-in?verified=1
```

**No SMTP configured?** Development prints the verification link to the
`next dev` console instead of sending mail, so the whole flow is testable with
zero setup. Production, however, **silently sends nothing** — configuring this
before launch is mandatory.

Takes ~15 minutes (plus DNS propagation time for the domain).

---

## 1. Create a Resend account & API key

1. Sign up at **https://resend.com** (free tier: 3,000 emails/month, 100/day —
   plenty to start).
2. Go to **API Keys** → **Create API Key**:
   - **Name**: e.g. `saakie-smtp`
   - **Permission**: *Sending access* is enough.
3. Copy the key (starts with `re_`) — it becomes `SMTP_PASS`. Treat it like a
   password; it's shown only once. If lost, delete the key and create a new one.

---

## 2. Verify the sending domain (`saakiebyknk.in`)

Resend must prove to inboxes that you own the domain you send from.
**Until this is done, two hard limits apply:**

- You **cannot** send from a domain you don't own — a from-address like
  `…@gmail.com` is rejected outright with
  `550 The gmail.com domain is not verified`.
- The fallback sender `onboarding@resend.dev` delivers **only to the email
  address the Resend account was created with** — fine for a smoke test,
  useless for real customers.

Steps:

1. In Resend: **Domains** → **Add Domain** → enter `saakiebyknk.in`
   (any region is fine).
2. Resend shows **DNS records** — add them wherever the domain's DNS is
   managed (registrar or Cloudflare):

   | Type | Name / Host | Value |
   |---|---|---|
   | MX  | `send` | `feedback-smtp.<region>.amazonses.com` (priority 10) |
   | TXT | `send` | `v=spf1 include:amazonses.com ~all` |
   | TXT | `resend._domainkey` | `p=…` (long DKIM key — unique per account) |

   Copy the exact values from *your* dashboard. Some DNS panels want the full
   host (`send.saakiebyknk.in`), others just `send`.
3. Back in Resend, click **Verify DNS Records**. Usually minutes; can take up
   to an hour.
4. Optional but recommended for deliverability: a DMARC record —
   TXT, name `_dmarc`, value `v=DMARC1; p=none;`.

---

## 3. Fill in the environment variables

All five live in this repo's env (see `.env.example`), locally in `.env.local`
and in **Vercel → Settings → Environment Variables** for production:

| Variable | Value |
|---|---|
| `SMTP_HOST` | `smtp.resend.com` |
| `SMTP_PORT` | `587` (the code switches to TLS automatically if you use `465`) |
| `SMTP_USER` | `resend` — the literal word, not an email address |
| `SMTP_PASS` | the `re_…` API key from step 1 |
| `EMAIL_FROM` | `Saakie by KNK <no-reply@saakiebyknk.in>` — the address **must** be on the verified domain |

Also confirm `NEXT_PUBLIC_APP_URL` — it's the origin baked into the emailed
links: `https://saakiebyknk.in` on Vercel, `http://localhost:3001` locally
(the dev server runs on port 3001).

After changing Vercel env vars, **redeploy** — they only apply to new
deployments.

> **Local tip:** you can leave the `SMTP_*` block commented out in
> `.env.local`. Dev then logs each verification link to the console, and real
> mail only ever goes out from production.

---

## 4. Test

1. Sign up on the live site with a real address (before domain verification
   completes, use the address you registered with Resend).
2. The email should arrive within seconds: subject **"Confirm your email —
   Saakie by KNK"**, rose-branded button, from `no-reply@saakiebyknk.in`.
3. Clicking **Confirm email** should land on `/sign-in` with the green
   "email confirmed" banner; signing in should now succeed.
4. Check Resend → **Emails**: every send appears with its delivery status.
   This log is your first stop when debugging.

---

## Troubleshooting

| Symptom | Cause & fix |
| --- | --- |
| No email arrives, nothing in Resend → Emails | SMTP creds wrong (`SMTP_USER` must be the literal `resend`, `SMTP_PASS` the API key), or `SMTP_HOST` is unset in production — the app then skips sending with only a server-side `console.error`. |
| `550 The gmail.com domain is not verified` in server logs | `EMAIL_FROM` uses an address on a domain you haven't verified (e.g. a Gmail address). Use `no-reply@saakiebyknk.in` after step 2 completes. |
| Email logged in Resend but never delivered | Sender is `onboarding@resend.dev` (delivers only to your own Resend account email) or the domain isn't verified yet. |
| Link lands on `/sign-in?error=confirmation_failed` | The link is older than 24 h, a newer link was issued since (each resend replaces earlier tokens), or `NEXT_PUBLIC_APP_URL` doesn't match the app's real origin. Use the resend button to get a fresh link. |
| Resend button says a link was sent but nothing arrives | The resend endpoint answers generically on purpose (no account probing). Check the server logs and Resend → Emails for the real outcome; note the 5-per-15-min IP rate limit and 60 s cooldown. |
| Emails land in spam | DNS records incomplete — re-check DKIM/SPF under Resend → Domains and add the DMARC record from step 2. |
| Verification links point at the wrong host/port | `NEXT_PUBLIC_APP_URL` is stale — it must be `http://localhost:3001` locally and `https://saakiebyknk.in` in production. |

---

## Alternative: Resend HTTP API (not used here)

Resend also has an HTTP API + SDK (`resend` npm package) with code-owned
React Email templates. SMTP was chosen instead because it keeps the app
provider-agnostic — swapping to Brevo/SES/anything is an env-var change, no
code change. Revisit the SDK if the app starts sending richer transactional
mail (order confirmations, shipping updates), which would be the point to add
`resend` as a dependency and a `RESEND_API_KEY` env var.
