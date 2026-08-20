// Generate an ORIGINAL sample saree catalog for the DEMO database.
//
//   node scripts/seed-sample-sarees.mjs                 -> dry run: write sample-sarees.json + print table (NO DB write)
//   node scripts/seed-sample-sarees.mjs --push          -> insert the generated products into the DB
//   node scripts/seed-sample-sarees.mjs --push --reset   -> delete existing products first, then insert
//
// All content here is original/synthetic (no third-party catalog data). Products
// are mapped onto the categories that already exist in the connected database,
// so categoryId always resolves. Each product gets a unique royalty-free Indian
// saree image, plus a few APPROVED sample reviews authored by demo users so the
// star rating on the storefront is backed by real review records.
import { MongoClient, ObjectId } from 'mongodb';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import bcrypt from 'bcryptjs';

const args = process.argv.slice(2);
const PUSH = args.includes('--push');
const RESET = args.includes('--reset');

function readEnvUrl() {
  for (const file of ['.env.local', '.env']) {
    if (!existsSync(file)) continue;
    for (const raw of readFileSync(file, 'utf8').split('\n')) {
      const line = raw.trim();
      if (line.startsWith('#') || !line.startsWith('DATABASE_URL')) continue;
      let v = line.slice(line.indexOf('=') + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (v) return v;
    }
  }
  return null;
}

const url = readEnvUrl();
if (!url) {
  console.error('ERROR: DATABASE_URL not found in .env.local or .env');
  process.exit(1);
}
const dbName = (() => {
  try {
    return new URL(url).pathname.replace(/^\//, '') || 'saakie';
  } catch {
    return 'saakie';
  }
})();

// ── Original sample content, keyed by category slug. Each entry contributes a
//    few sarees to that category. Prices in INR. ──────────────────────────────
const PALETTE = {
  Maroon: '#7d2128', Indigo: '#33415c', Mustard: '#e6870b', Emerald: '#0f5132',
  Ivory: '#f5f0e6', Rose: '#b94047', Teal: '#1b6b6b', Charcoal: '#2b2b2b',
  'Mehendi Green': '#5b6b2f', Saffron: '#f4a300', 'Powder Blue': '#9dc3d4', Wine: '#5e1b21',
}
const COLOR_NAMES = Object.keys(PALETTE)

const OCCASIONS = ['Festive', 'Wedding', 'Casual', 'Office', 'Party', 'Daily Wear']

// ── Demo reviewer accounts. Synthetic users (no real PII) created only so the
//    sample reviews have an author. Marked with a `demo: true` flag and a shared
//    email domain so they're easy to identify / clean up. ──────────────────────
const DEMO_USERS = [
  { name: 'Krutika Sharma', email: 'krutika.demo@saakie.test' },
  { name: 'Akshay Mehta', email: 'akshay.demo@saakie.test' },
  { name: 'Roshani Reddy', email: 'roshani.demo@saakie.test' },
  { name: 'Pramila Iyer', email: 'pramila.demo@saakie.test' },
  { name: 'Kalyani Nair', email: 'kalyani.demo@saakie.test' },
  { name: 'Neha Desai', email: 'neha.demo@saakie.test' },
]

// Review snippets. (rating is a whole number 1-5, per the schema.) Picked
// deterministically per product so runs stay stable.
const REVIEW_TEXTS = [
  { rating: 5, title: 'Absolutely beautiful', comment: 'The fabric feels premium and the drape is gorgeous. Got so many compliments!' },
  { rating: 5, title: 'Loved it', comment: 'Colour is exactly as shown. Lightweight and very comfortable to wear all day.' },
  { rating: 4, title: 'Very good quality', comment: 'Lovely saree, the work is neat. Delivery was on time. Slightly less vibrant in person.' },
  { rating: 5, title: 'Worth every rupee', comment: 'Elegant and well-finished. Perfect for the festive season.' },
  { rating: 4, title: 'Nice for the price', comment: 'Good everyday saree. Soft material, easy to manage. Would buy again.' },
  { rating: 5, title: 'Stunning piece', comment: 'The zari/border detailing is exquisite. Looks even better than the pictures.' },
  { rating: 4, title: 'Happy with it', comment: 'Comfortable and breathable. The blouse piece matched well.' },
  { rating: 3, title: 'Decent', comment: 'It is okay for casual wear. Texture is fine but nothing exceptional.' },
]

// Royalty-free Indian-saree photos from Pexels (Pexels License: free for
// commercial use, no attribution required). The IDs in scripts/data/
// saree-image-ids.json were scraped from Pexels saree searches and EACH was
// verified to return image/jpeg (HTTP 200); a representative sample was visually
// confirmed to depict an Indian saree. Every product is assigned a DISTINCT
// photo (no repeats), drawn in order from this pool. Swap in your own product
// photography for launch.
function pexels(id, w = 900) {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`
}
const IMAGE_IDS = JSON.parse(readFileSync(new URL('./data/saree-image-ids.json', import.meta.url), 'utf8'))
const IMAGE_POOL = IMAGE_IDS.map((id) => pexels(id))

// Per-category flavour: fabric, work, pattern, price band, and a pool of unique
// saree names. Every item is a Saree (no other product type). All names are
// distinct across the whole catalog.
const CATALOG = {
  'block-print-chiffon-sarees-': { fabric: 'Chiffon', work: 'Block Print', pattern: 'Floral Block Print', lo: 1499, hi: 2999, names: ['Hand-Block Chiffon Saree', 'Sanganeri Bloom Chiffon Saree', 'Jaipuri Block Chiffon Saree', 'Dabu-Print Chiffon Saree'] },
  'handwork-chiffon-sarees': { fabric: 'Chiffon', work: 'Hand Embroidery', pattern: 'Sequin & Thread', lo: 2499, hi: 4999, names: ['Aari Handwork Chiffon Saree', 'Mirror-Work Chiffon Saree', 'Zardozi Chiffon Saree', 'Resham Embroidered Chiffon Saree'] },
  '120-count-mul-cotton': { fabric: 'Mul Cotton', work: 'Handloom', pattern: 'Fine Weave', lo: 999, hi: 1999, names: ['120-Count Mulmul Breeze Saree', 'Featherlight 120s Mul Cotton Saree', 'Bengal Mulmul 120 Saree', 'Summer Mul Cotton Saree'] },
  '100-count-mul-cotton': { fabric: 'Mul Cotton', work: 'Handloom', pattern: 'Plain Weave', lo: 899, hi: 1799, names: ['100-Count Soft Mul Saree', 'Everyday Mulmul Cotton Saree', 'Pastel Mul Cotton Saree', 'Handwoven 100s Mul Saree'] },
  'khadi-cotton': { fabric: 'Khadi Cotton', work: 'Handspun', pattern: 'Textured Khadi', lo: 1199, hi: 2399, names: ['Handspun Khadi Classic Saree', 'Earthy Khadi Cotton Saree', 'Natural-Dye Khadi Saree', 'Gandhi Khadi Heritage Saree'] },
  '120-count-pure-linen': { fabric: 'Pure Linen', work: 'Handloom', pattern: 'Striped', lo: 1799, hi: 3499, names: ['120-Count Linen Luxe Saree', 'Crisp 120s Pure Linen Saree', 'Striped 120 Linen Saree'] },
  '100-count-linen': { fabric: 'Pure Linen', work: 'Handloom', pattern: 'Solid', lo: 1599, hi: 2999, names: ['100-Count Linen Staple Saree', 'Breathable Pure Linen Saree', 'Solid 100s Linen Saree'] },
  'sequin-silk-linen': { fabric: 'Silk Linen', work: 'Sequin Work', pattern: 'All-over Sequin', lo: 2999, hi: 5999, names: ['Sequin Silk-Linen Shimmer Saree', 'Starlit Sequin Silk Linen Saree', 'Glitter Sequin Silk-Linen Saree'] },
  'plain-silk-linen': { fabric: 'Silk Linen', work: 'Plain', pattern: 'Solid', lo: 1999, hi: 3999, names: ['Minimal Silk-Linen Saree', 'Plain Silk-Linen Grace Saree', 'Solid Silk-Linen Everyday Saree'] },
  'muslin-silk': { fabric: 'Muslin Silk', work: 'Handloom', pattern: 'Fine Sheer', lo: 2299, hi: 4499, names: ['Muslin Silk Whisper Saree', 'Sheer Muslin Silk Saree', 'Featherlight Muslin Silk Saree'] },
  'kora-silk': { fabric: 'Kora Silk', work: 'Zari Border', pattern: 'Temple Border', lo: 2799, hi: 5499, names: ['Kora Silk Heritage Saree', 'Crisp Kora Silk Zari Saree', 'Banarasi Kora Silk Saree'] },
  'matka-silk': { fabric: 'Matka Silk', work: 'Handloom', pattern: 'Slub Texture', lo: 2499, hi: 4999, names: ['Matka Silk Rustic Saree', 'Textured Matka Silk Saree', 'Bhagalpuri Matka Silk Saree'] },
  'chanderi-silk': { fabric: 'Chanderi Silk', work: 'Zari Buti', pattern: 'Butti', lo: 2199, hi: 4799, names: ['Chanderi Silk Sheen Saree', 'Royal Chanderi Buti Saree', 'Gold-Buti Chanderi Silk Saree', 'Pastel Chanderi Silk Saree'] },
  'kota-doria': { fabric: 'Kota Doria', work: 'Handloom', pattern: 'Kota Check', lo: 1299, hi: 2799, names: ['Kota Doria Featherweight Saree', 'Classic Kota Check Saree', 'Zari-Border Kota Doria Saree'] },
  'maheshwari-silk': { fabric: 'Maheshwari Silk', work: 'Zari Border', pattern: 'Reversible Border', lo: 1999, hi: 3999, names: ['Maheshwari Silk Classic Saree', 'Reversible Maheshwari Saree', 'Temple-Border Maheshwari Saree'] },
  'block-print-maheshwari-silk': { fabric: 'Maheshwari Silk', work: 'Block Print', pattern: 'Floral Block', lo: 2299, hi: 4299, names: ['Block-Print Maheshwari Saree', 'Bagh-Print Maheshwari Silk Saree', 'Indigo Block Maheshwari Saree'] },
  'block-print-chanderi-silk': { fabric: 'Chanderi Silk', work: 'Block Print', pattern: 'Floral Block', lo: 2499, hi: 4599, names: ['Block-Print Chanderi Saree', 'Hand-Block Chanderi Silk Saree', 'Botanical Block Chanderi Saree'] },
  'with-readymade-blouse': { fabric: 'Art Silk', work: 'Designer', pattern: 'Contemporary', lo: 2999, hi: 6999, blouse: true, names: ['Designer Saree with Readymade Blouse', 'Ready-to-Wear Designer Saree', 'Party Designer Saree with Blouse', 'Festive Designer Saree Set'] },
  'without-readymade-blouse': { fabric: 'Art Silk', work: 'Designer', pattern: 'Contemporary', lo: 2499, hi: 5999, names: ['Designer Saree (Unstitched Blouse)', 'Statement Designer Drape Saree', 'Contemporary Designer Saree', 'Ruffle Designer Saree'] },
  'narayanpet-sarees': { fabric: 'Cotton Silk', work: 'Handloom', pattern: 'Temple & Checks', lo: 1799, hi: 3499, names: ['Narayanpet Temple Border Saree', 'Classic Narayanpet Checks Saree', 'Traditional Narayanpet Silk Saree'] },
  'ikkat-silk': { fabric: 'Ikkat Silk', work: 'Ikat Weave', pattern: 'Ikat', lo: 2999, hi: 5999, names: ['Pochampally Ikkat Silk Saree', 'Telia Ikkat Silk Saree', 'Double-Ikat Pochampally Saree', 'Sambalpuri Ikkat Saree'] },
  'modal-cotton': { fabric: 'Modal Cotton', work: 'Digital Print', pattern: 'Printed', lo: 1099, hi: 2299, names: ['Modal Cotton Easywear Saree', 'Printed Modal Comfort Saree', 'Floral Modal Cotton Saree', 'Geometric Modal Cotton Saree'] },
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}
// Deterministic pseudo-random from an index (no Math.random — keeps runs stable).
function pick(arr, n) { return arr[n % arr.length] }
function priceIn(lo, hi, n) {
  const steps = Math.floor((hi - lo) / 100)
  const v = lo + (n * 137 % (steps + 1)) * 100
  return v
}

function buildProducts(categoriesBySlug) {
  const products = []
  let i = 0
  for (const [slug, def] of Object.entries(CATALOG)) {
    const cat = categoriesBySlug.get(slug)
    if (!cat) continue // category not in this DB — skip
    for (let k = 0; k < def.names.length; k++) {
      i++
      const name = def.names[k]
      const price = priceIn(def.lo, def.hi, i)
      const comparePrice = Math.round((price * (1.25 + (i % 3) * 0.1)) / 10) * 10
      const c1 = pick(COLOR_NAMES, i)
      const c2 = pick(COLOR_NAMES, i + 3)
      const occ = [pick(OCCASIONS, i), pick(OCCASIONS, i + 2)]
      // Each product gets a DISTINCT image (sequential from the verified pool).
      const imageUrl = IMAGE_POOL[i - 1]
      // 2-4 deterministic reviews per product, each by a distinct demo user
      // (one review per user per product, per the API rule).
      const reviewCount = 2 + (i % 3) // 2, 3, or 4
      const reviews = []
      for (let r = 0; r < reviewCount; r++) {
        const t = REVIEW_TEXTS[(i + r) % REVIEW_TEXTS.length]
        reviews.push({
          userIndex: (i + r) % DEMO_USERS.length, // which demo user authored it
          rating: t.rating,
          title: t.title,
          comment: t.comment,
        })
      }
      // Product.rating mirrors the average of its (approved) reviews so the
      // listing sort and the detail page agree.
      const avg = reviews.reduce((s, rv) => s + rv.rating, 0) / reviews.length
      products.push({
        imageUrl,
        reviews,
        name,
        slug: slugify(name) + '-' + (i),
        description:
          `A handpicked ${def.fabric.toLowerCase()} saree featuring ${def.pattern.toLowerCase()} ` +
          `and ${def.work.toLowerCase()} craftsmanship. Lightweight, elegant drape suited for ${occ[0].toLowerCase()} ` +
          `and ${occ[1].toLowerCase()} occasions. Comes with an unstitched blouse piece unless noted.`,
        shortDescription: `${def.fabric} · ${def.work}`,
        price,
        comparePrice,
        categoryId: cat._id,
        categorySlug: slug,
        categoryName: (cat.name || '').trim(),
        brand: 'Saakie by KNK',
        tags: [def.fabric, def.work, 'Saree', occ[0]],
        material: def.fabric,
        fabric: def.fabric,
        pattern: def.pattern,
        workType: def.work,
        occasion: occ,
        blouseIncluded: !!def.blouse,
        colors: [c1, c2],
        stock: 8 + (i % 5) * 4,
        rating: Number(avg.toFixed(1)),
        isActive: true,
        isFeatured: i % 6 === 0,
      })
    }
  }
  // Hard guarantee: no image may repeat. Fail loudly if the verified pool is
  // smaller than the catalog (would force a reuse).
  if (products.length > IMAGE_POOL.length) {
    throw new Error(
      `Need ${products.length} unique images but only ${IMAGE_POOL.length} verified images in the pool. ` +
        `Add more IDs to scripts/data/saree-image-ids.json.`
    )
  }
  const uniqueImgs = new Set(products.map((p) => p.imageUrl))
  if (uniqueImgs.size !== products.length) {
    throw new Error(`Image uniqueness violated: ${products.length} products but ${uniqueImgs.size} distinct images.`)
  }
  return products
}

const client = new MongoClient(url)

async function main() {
  await client.connect()
  const db = client.db(dbName)
  const cats = await db.collection('categories').find({}).toArray()
  const bySlug = new Map(cats.map((c) => [c.slug, c]))

  const products = buildProducts(bySlug)

  // Write a reviewable JSON (ids stringified) + a readable summary.
  const review = products.map((p) => ({ ...p, categoryId: String(p.categoryId) }))
  writeFileSync('sample-sarees.json', JSON.stringify(review, null, 2))

  const totalReviews = products.reduce((n, p) => n + (p.reviews?.length || 0), 0)
  console.log(`Generated ${products.length} sample sarees across ${new Set(products.map((p) => p.categorySlug)).size} categories.`)
  console.log(`Plus ${totalReviews} reviews by ${DEMO_USERS.length} demo users.`)
  console.log(`Review file: sample-sarees.json\n`)
  console.log('  #  NAME                                  CATEGORY                    PRICE   MRP   ★RATE  REVIEWS')
  products.forEach((p, idx) => {
    console.log(
      `  ${String(idx + 1).padStart(2)} ${p.name.padEnd(38)} ${p.categoryName.padEnd(26)} ₹${String(p.price).padStart(5)} ₹${String(p.comparePrice).padStart(5)}  ${p.rating.toFixed(1)}   ${p.reviews?.length || 0}`
    )
  })

  if (!PUSH) {
    console.log('\nDRY RUN — nothing written to the database. Re-run with --push to insert (after you review).')
    await client.close()
    return
  }

  const coll = db.collection('products')
  const imagesColl = db.collection('images')
  const reviewsColl = db.collection('reviews')
  const usersColl = db.collection('users')

  if (RESET) {
    const delImg = await imagesColl.deleteMany({})
    const del = await coll.deleteMany({})
    // Only remove the demo reviewers/reviews (identified by the .test domain),
    // never real users or their reviews.
    const demoEmails = DEMO_USERS.map((u) => u.email)
    const demoUserDocs = await usersColl.find({ email: { $in: demoEmails } }).project({ _id: 1 }).toArray()
    const demoUserIds = demoUserDocs.map((u) => u._id)
    const delRev = await reviewsColl.deleteMany({ userId: { $in: demoUserIds } })
    console.log(
      `\n--reset: removed ${del.deletedCount} product(s), ${delImg.deletedCount} image(s), ${delRev.deletedCount} demo review(s).`
    )
  }

  const now = new Date()

  // 1. Ensure the demo reviewer users exist (upsert by email). Reused across
  //    runs so we don't pile up duplicate accounts.
  const demoPassword = await bcrypt.hash('demo-password', 10)
  const userIdByIndex = []
  for (let u = 0; u < DEMO_USERS.length; u++) {
    const { name, email } = DEMO_USERS[u]
    const existing = await usersColl.findOne({ email })
    if (existing) {
      userIdByIndex[u] = existing._id
    } else {
      const _id = new ObjectId()
      await usersColl.insertOne({
        _id,
        email,
        password: demoPassword,
        name,
        role: 'USER',
        createdAt: now,
        updatedAt: now,
      })
      userIdByIndex[u] = _id
    }
  }

  // 2. Build product + image + review docs.
  const productDocs = []
  const imageDocs = []
  const reviewDocs = []
  for (const p of products) {
    const productId = new ObjectId()
    // Strip helper-only fields that aren't part of the Product schema.
    const { categorySlug, categoryName, colors, imageUrl, reviews, ...rest } = p
    productDocs.push({
      _id: productId,
      ...rest,
      categoryId: p.categoryId, // real ObjectId
      details: null,
      costPrice: null,
      salesCount: 0,
      lowStockAlert: 5,
      weight: null,
      careInstructions: 'Dry clean recommended. Store folded in a cool, dry place.',
      createdAt: now,
      updatedAt: now,
    })
    // Images live in a separate collection, linked by productId (Prisma relation).
    if (imageUrl) {
      imageDocs.push({
        _id: new ObjectId(),
        url: imageUrl,
        publicId: null,
        width: 900,
        height: 1350,
        format: 'jpeg',
        alt: p.name,
        order: 0,
        isPrimary: true,
        productId,
      })
    }
    // Reviews — APPROVED so they show publicly, each by a distinct demo user.
    for (const rv of reviews || []) {
      reviewDocs.push({
        _id: new ObjectId(),
        userId: userIdByIndex[rv.userIndex],
        productId,
        rating: rv.rating,
        title: rv.title,
        comment: rv.comment,
        images: [],
        isVerified: true,
        status: 'APPROVED',
        createdAt: now,
        updatedAt: now,
      })
    }
  }

  const res = await coll.insertMany(productDocs, { ordered: false })
  const imgRes = imageDocs.length ? await imagesColl.insertMany(imageDocs, { ordered: false }) : { insertedCount: 0 }
  const revRes = reviewDocs.length ? await reviewsColl.insertMany(reviewDocs, { ordered: false }) : { insertedCount: 0 }
  console.log(
    `\nInserted ${res.insertedCount} products, ${imgRes.insertedCount} images, ${revRes.insertedCount} reviews into "${dbName}".`
  )
  console.log(`Demo reviewer accounts: ${DEMO_USERS.length} (emails @saakie.test).`)
  await client.close()
}

main().catch((e) => {
  console.error('Failed:', e)
  process.exitCode = 1
}).finally(() => client.close())
