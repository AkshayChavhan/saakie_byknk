// Backfill Product.salesCount and Product.rating from existing data.
//
//   node scripts/backfill-product-stats.mjs           -> report what would change
//   node scripts/backfill-product-stats.mjs --apply   -> write the numbers
//
// From this release on, payment settlement adds to `salesCount` and review
// moderation recomputes `rating`, and the storefront sorts and badges read
// those fields instead of counting relations per request. Products that
// existed before carry 0 until this runs. Safe to re-run: it recomputes from
// scratch every time. Reads DATABASE_URL from .env.local / .env.
import { MongoClient } from 'mongodb';
import { readFileSync, existsSync } from 'node:fs';

const APPLY = process.argv.includes('--apply');

function readEnv(key) {
  for (const file of ['.env.local', '.env']) {
    if (!existsSync(file)) continue;
    for (const raw of readFileSync(file, 'utf8').split('\n')) {
      const line = raw.trim();
      if (line.startsWith('#') || !line.startsWith(`${key}=`)) continue;
      return line.slice(key.length + 1).replace(/^["']|["']$/g, '');
    }
  }
  return process.env[key];
}

const url = readEnv('DATABASE_URL');
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const client = new MongoClient(url);
await client.connect();
const db = client.db();

// Units sold per product across PAID orders.
const sales = await db
  .collection('order_items')
  .aggregate([
    {
      $lookup: {
        from: 'orders',
        localField: 'orderId',
        foreignField: '_id',
        as: 'order',
      },
    },
    { $unwind: '$order' },
    { $match: { 'order.paymentStatus': 'PAID' } },
    { $group: { _id: '$productId', salesCount: { $sum: '$quantity' } } },
  ])
  .toArray();

// Average rating per product over approved reviews.
const ratings = await db
  .collection('reviews')
  .aggregate([
    { $match: { status: 'APPROVED' } },
    { $group: { _id: '$productId', rating: { $avg: '$rating' } } },
  ])
  .toArray();

const salesById = new Map(sales.map((r) => [String(r._id), r.salesCount]));
const ratingById = new Map(ratings.map((r) => [String(r._id), Math.round(r.rating * 100) / 100]));

const products = await db
  .collection('products')
  .find({}, { projection: { name: 1, salesCount: 1, rating: 1 } })
  .toArray();

let changed = 0;
for (const p of products) {
  const salesCount = salesById.get(String(p._id)) ?? 0;
  const rating = ratingById.get(String(p._id)) ?? 0;
  if ((p.salesCount ?? 0) === salesCount && (p.rating ?? 0) === rating) continue;
  changed += 1;
  console.log(
    `${p.name}: salesCount ${p.salesCount ?? 0} -> ${salesCount}, rating ${p.rating ?? 0} -> ${rating}`
  );
  if (APPLY) {
    await db.collection('products').updateOne({ _id: p._id }, { $set: { salesCount, rating } });
  }
}

await client.close();
console.log(
  changed === 0
    ? 'All products are up to date.'
    : APPLY
      ? `Updated ${changed} product(s).`
      : `${changed} product(s) would change. Re-run with --apply to write them.`
);
