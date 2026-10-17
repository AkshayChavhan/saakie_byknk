# Product-photo watermark

Every product photo the store shows carries the Saakie_by KNK logo. The mark
is composed by Cloudinary when the image is delivered, so the file itself is
marked: a right-click save or a scraper gets the logo too, and no clean URL
ever reaches the browser.

## How it works

`lib/image-watermark.ts` rewrites an image URL:

| Source | Result |
|---|---|
| Uploaded to Cloudinary (`/image/upload/…`) | the overlay transformation is spliced in after `/upload/` |
| Any other `https://` photo (the Unsplash/Pexels demo catalogue), with `WATERMARK_FETCH_REMOTE=true` | rewritten to `res.cloudinary.com/<cloud>/image/fetch/<overlay>/<encoded url>`, so Cloudinary fetches and marks it on the way through |
| Local files (`/images/placeholder-*.svg`), data URLs | untouched |

The overlay is `l_saakie-byknk:watermark,o_55,g_center,fl_relative,w_0.7`:
the logo asset, 55 % opacity, centred, 70 % of the photo's width whatever its
size.

`lib/server/watermark.ts` applies it to API shapes (`markProduct`,
`markLines`, `markImages`), and every response that carries a product photo
goes through one of them: product list, product page, category pages, home
page loaders, cart, wishlist, orders, and the admin product, order and
dashboard endpoints. Admins see the marked photos too.

## Setup

1. Upload the logo once per Cloudinary account:

   ```bash
   node scripts/upload-watermark.mjs
   ```

   It reads the Cloudinary keys from `.env.local`, trims the transparent
   border, limits the PNG to 1600 px and stores it as `saakie-byknk/watermark`.
   The source file is `assets/branding/saakie-watermark.png`. Run it again
   whenever the logo changes; the asset is overwritten in place.

2. For the remote demo photos, Cloudinary must be allowed to fetch images.
   New accounts restrict this: in the Cloudinary console open Settings →
   Security → "Restricted image types" and untick **Fetched URL** (optionally
   list `images.unsplash.com` and `images.pexels.com` under "Allowed fetch
   domains"). Then set `WATERMARK_FETCH_REMOTE=true`. Without the setting the
   fetch URLs answer 401 ("Images of type fetch are restricted"), which is why
   the rewrite is opt-in. `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` must be set.

3. The feature is on by default. `WATERMARK_ENABLED=false` switches it off;
   `WATERMARK_PUBLIC_ID` overrides the asset id.

**Do the upload before deploying this code.** Cloudinary answers a missing
overlay asset with an error, which would show as broken product images.

## Tuning

`watermarkImageUrl(url, { scale, opacity })` takes a width fraction and an
opacity for one-off cases. The defaults live in `overlayTransform()`.
