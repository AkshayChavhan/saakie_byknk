# Traffic analytics (Umami)

The store records basic visitor traffic with [Umami](https://umami.is):
visitors, page views, referrers, devices, countries and live visitors.

It records **nothing else**: no custom events, no purchases, no revenue and
no user identity. It sets no cookies.

## Why Umami and not Vercel Analytics

The Vercel Analytics and Speed Insights scripts only report to Vercel's own
servers, so on Netlify they collected nothing. They were removed.

## Turn it on

1. Create an Umami account (Umami Cloud has a free plan) and add a website:
   name it for the store, domain `saakiebyknk.in`.
2. Copy the website's **Website ID**, a UUID.
3. In Netlify, open Site configuration, Environment variables, and add:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | the Website ID |

4. **Redeploy.** `NEXT_PUBLIC_` values are baked in when the site is built,
   so setting the variable alone changes nothing until the next deploy.
5. Visit the live site, then open Umami's Realtime view. You should see
   yourself within a few seconds.

Until the variable is set, no script loads, so local development, tests and
unconfigured previews send nothing.

## What it records and what it ignores

- **Counted:** visits to the site's own hostname, with Umami's standard
  fields: page, referrer, browser, operating system, device, country.
- **Ignored:** visits from localhost, Netlify preview and deploy URLs. The
  script is told to report only for the host in `NEXT_PUBLIC_APP_URL` and its
  `www` twin. Override with `NEXT_PUBLIC_UMAMI_DOMAINS` if you serve from
  other hostnames.
- **Ignored:** visitors whose browser sends Do Not Track.
- **Campaign tags:** Umami reads `utm_source`, `utm_medium` and
  `utm_campaign` from a link's address by itself. Tagging the links you post,
  for example `?utm_source=instagram&utm_campaign=diwali`, needs no code.

## Viewing the stats from the admin

The admin dashboard has an **Analytics** card, shown to SUPER_ADMIN only, that opens your Umami dashboard
in a new tab. It works through Umami's share link:

1. In Umami, open the website, then Settings, then **Share URL**, and turn it on.
2. In Netlify add `UMAMI_SHARE_URL` with that link (no `NEXT_PUBLIC_` prefix) and redeploy.

The card points at `/api/admin/analytics`, which checks for a SUPER_ADMIN
and only then redirects, so admins and customers never get the link. The repository is
public, so never put the link in code or docs. Anyone holding it can read the
stats; turn Share URL off in Umami to revoke it.

## Self-hosting

To use your own Umami instead of the cloud one, also set
`NEXT_PUBLIC_UMAMI_SCRIPT_URL` to your instance's `script.js` (it must be an
`https://` address). Umami needs its own Postgres database, separate from the
store's MongoDB.

## Turn it off

Remove `NEXT_PUBLIC_UMAMI_WEBSITE_ID` and redeploy.

## Privacy policy

The privacy policy page does not yet mention analytics. Add a short sentence
saying the site uses privacy-friendly traffic statistics without cookies or
personal data. That wording is a business decision, so it is not changed here.
