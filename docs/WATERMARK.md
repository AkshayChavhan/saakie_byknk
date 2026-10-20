# Product-photo watermark

Product photos uploaded from **19 October 2026** onwards carry the
Saakie_by KNK logo. Photos uploaded before that date are delivered exactly as
they were, as are the Unsplash/Pexels demo photos. The mark is composed by
Cloudinary when the image is delivered, so the file itself is marked: a
right-click save or a scraper gets the logo too, and no clean URL of a marked
photo ever reaches the browser.

## How it works

`lib/image-watermark.ts` rewrites a Cloudinary upload URL
(`…/image/upload/v<n>/<id>.<ext>`) by splicing in the overlay transformation
`l_saakie-byknk:watermark,o_55,g_center,fl_relative,w_0.7`: the logo asset,
55 % opacity, centred, 70 % of the photo's width whatever its size.

`v<n>` is Cloudinary's upload version, which is the upload time in Unix
seconds. The helper compares it with the cutover (`WATERMARK_SINCE`, default
`2026-10-19T00:00:00Z`) and leaves older photos untouched. Re-uploading a
photo through the admin gives it a new version, and therefore the mark.

`lib/server/watermark.ts` applies the helper to API shapes (`markProduct`,
`markLines`, `markImages`), and every response that carries a product photo
goes through one of them: product list, product page, category pages, home
page loaders, cart, wishlist, orders, and the admin product, order and
dashboard endpoints. Admins see the marked photos too.

Not marked: admin-uploaded hero slides (`HeroSlide.image`). They are banner
artwork, not product photos, and `loadHeroSlides` returns them clean. The
product-derived fallback slides the hero shows until an admin creates one are
product photos and keep the mark.

## Setup

1. Upload the logo once per Cloudinary account (already done for the store's
   account on 2026-10-18):

   ```bash
   node scripts/upload-watermark.mjs
   ```

   It reads the Cloudinary keys from `.env.local`, trims the transparent
   border, limits the PNG to 1600 px and stores it as `saakie-byknk/watermark`.
   The source file is `assets/branding/saakie-watermark.png`. Run it again
   whenever the logo changes; the asset is overwritten in place.

2. The feature is on by default. `WATERMARK_ENABLED=false` switches it off,
   `WATERMARK_SINCE` moves the cutover, `WATERMARK_PUBLIC_ID` overrides the
   asset id.

**Do the upload before deploying this code** on a new Cloudinary account.
Cloudinary answers a missing overlay asset with an error, which would show as
broken product images.

## Marking older photos later

Move `WATERMARK_SINCE` back (for example to `2000-01-01`) and every Cloudinary
photo is marked on the next request. Nothing is rewritten in storage, so the
decision is reversible at any time.

## Tuning

`watermarkImageUrl(url, { scale, opacity })` takes a width fraction and an
opacity for one-off cases. The defaults live in `overlayTransform()`.
