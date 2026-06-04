# Sample Saree Seeder — `seed-sample-sarees.mjs`

Seeds the **demo** database with an original sample saree catalog so the
storefront has products to show. All product content is synthetic (no
third-party catalog data); every product is mapped onto the **categories that
already exist** in the connected database, and each gets a **distinct, verified
royalty-free Indian-saree image** from Pexels.

> ⚠️ This script **writes to whatever database `.env.local` points at.** Always
> confirm you are pointed at the **demo** cluster before using `--push` /
> `--reset`. It never edits categories or other collections — only `products`
> and `images`.

---

## What it does

- Reads `DATABASE_URL` from `.env.local` (falls back to `.env`).
- Reads the live `categories` collection and maps each sample saree to a real
  category `_id` (so the `Product → Category` relation always resolves).
- Generates **76 unique sarees** across the **22 existing leaf categories**
  (3–4 per category) with realistic name, description, price, MRP
  (`comparePrice`), fabric, pattern, work type, occasion, stock, rating, tags.
- Assigns each product a **unique** Indian-saree image (no repeats) from a pool
  of 118 verified Pexels photo IDs (`scripts/data/saree-image-ids.json`).
- Generates **2–4 APPROVED reviews per product** (~228 total) authored by **6
  demo reviewer users**, so the star rating on the storefront is backed by real
  review records. Each product's `rating` equals the average of its reviews.
- Writes a human-readable preview to `sample-sarees.json` and prints a table.
- On `--push`, inserts: products → `products`, one image per product →
  `images`, demo users → `users` (upserted by email), reviews → `reviews`.

---

## Usage

Run from the project root. Node 20+ is required (use `nvm use 20` first if the
system Node is older).

```bash
# 1. DRY RUN (default) — generates sample-sarees.json + prints the table.
#    Writes NOTHING to the database. Use this to review.
node scripts/seed-sample-sarees.mjs

# 2. PUSH — insert the 76 sarees + images into the DB that .env.local points at.
node scripts/seed-sample-sarees.mjs --push

# 3. PUSH + RESET — delete existing products & images first, then insert.
#    Idempotent: re-running always leaves exactly 76 products.
node scripts/seed-sample-sarees.mjs --push --reset
```

### Flags

| Flag       | Effect                                                                 |
| ---------- | ---------------------------------------------------------------------- |
| *(none)*   | Dry run. Writes `sample-sarees.json` and prints a table. No DB writes. |
| `--push`   | Inserts the generated products + images into the DB.                   |
| `--reset`  | (with `--push`) Deletes all existing products + images first.          |

### `--push` vs `--push --reset`

| Command                | Effect on re-run                                  |
| ---------------------- | ------------------------------------------------- |
| `--push`               | **Adds** 76 every run → duplicates accumulate.    |
| `--push --reset`       | **Clears then adds** → always exactly 76 products.|

For a demo, prefer `--push --reset` so re-running gives a clean, predictable
catalog instead of piling up duplicates.

---

## Flow

```
node scripts/seed-sample-sarees.mjs [--push] [--reset]
        │
        ▼
  ┌───────────────────────────────────────────────┐
  │ 1. Read DATABASE_URL from .env.local / .env     │
  │    → connect to that database                   │
  └───────────────────────────────────────────────┘
        │
        ▼
  ┌───────────────────────────────────────────────┐
  │ 2. Read live `categories` collection            │
  │    → build  slug → _id  map (real category IDs) │
  └───────────────────────────────────────────────┘
        │
        ▼
  ┌───────────────────────────────────────────────┐
  │ 3. Generate 76 sarees in memory:                │
  │    • unique name / slug / price / fabric ...    │
  │    • unique image from verified Pexels pool     │
  │    • GUARD: throw if any name/slug/image repeats │
  │      or pool < product count                    │
  └───────────────────────────────────────────────┘
        │
        ▼
  ┌───────────────────────────────────────────────┐
  │ 4. Write sample-sarees.json + print table       │
  │    (always — your review snapshot)              │
  └───────────────────────────────────────────────┘
        │
        ├── no --push ─────► STOP (dry run, nothing written)
        │
        ▼  (--push)
  ┌───────────────────────────────────────────────┐
  │ 5. (--reset only) deleteMany products + images  │
  │    + demo reviews (demo users matched by email) │
  └───────────────────────────────────────────────┘
        │
        ▼
  ┌───────────────────────────────────────────────┐
  │ 6. Upsert 6 demo users (by email) → `users`     │
  │    INSERT:                                      │
  │    • 76 docs  → `products`                      │
  │    • 76 docs  → `images`   (productId,isPrimary)│
  │    • ~228 docs→ `reviews`  (APPROVED, by demo)  │
  └───────────────────────────────────────────────┘
        │
        ▼
  ┌───────────────────────────────────────────────┐
  │ 7. Print inserted counts → disconnect           │
  └───────────────────────────────────────────────┘
```

### How it then shows in the app

```
Storefront → GET /api/products
   → Prisma joins category + first image
   → product cards render image • name • price • MRP
   → /products/[slug] detail page; category pages filter by real categoryId
```

---

## Files

| File                                  | Purpose                                              |
| ------------------------------------- | ---------------------------------------------------- |
| `scripts/seed-sample-sarees.mjs`      | The seeder (generation + push logic).                |
| `scripts/data/saree-image-ids.json`   | 118 verified royalty-free Pexels saree photo IDs.    |
| `sample-sarees.json` (project root)   | Generated review snapshot (overwritten each run).    |

> `sample-sarees.json` is a **preview only** — the app never reads it, and
> `--push` regenerates the products in memory rather than reading this file.
> To change the catalog, edit the `CATALOG` object inside the script.

---

## What gets written vs. left alone

| Collection            | Action                                                      |
| --------------------- | ----------------------------------------------------------- |
| `products`            | +76 inserted (replaced if `--reset`).                       |
| `images`              | +76 inserted (one per product).                             |
| `reviews`             | +~228 inserted (APPROVED; demo reviews cleared on `--reset`).|
| `users`               | 6 demo reviewers upserted by email (`@saakie.test`).         |
| `categories`          | **Read-only** — products just reference existing IDs.        |
| carts / orders        | **Untouched.**                                               |

> Demo users use the `@saakie.test` email domain and a shared dummy password,
> so they're easy to identify and `--reset` only removes **demo** reviews/users,
> never real ones.

---

## Safety notes

- **Target check:** the script writes to whatever `DATABASE_URL` resolves to.
  Confirm `.env.local` points at the **demo** cluster before `--push`/`--reset`.
- **`--reset` deletes ALL products + images** in the target DB, not only the
  ones this script created. Never run `--reset` against production.
- **Uniqueness guard:** the run throws (writes nothing) if product names/slugs
  or images would repeat, or if the image pool is smaller than the catalog.
- **Images:** royalty-free Pexels photos (Pexels License — free for commercial
  use, no attribution). Swap in your own product photography for launch.

---

## Customizing the catalog

Open `scripts/seed-sample-sarees.mjs` and edit the `CATALOG` object — keyed by
category slug. Each entry defines `fabric`, `work`, `pattern`, price band
(`lo`/`hi`), and a list of `names` (one product per name). Add or remove names
to change how many sarees a category gets. Re-run the dry run to preview, then
`--push --reset`.

If you add products beyond 118 total, add more verified image IDs to
`scripts/data/saree-image-ids.json` (the uniqueness guard will otherwise stop
the run).
