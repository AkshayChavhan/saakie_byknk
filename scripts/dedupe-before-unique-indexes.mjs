// Remove duplicate rows that would block the unique indexes added to
// prisma/schema.prisma:
//
//   cart_items      unique (cartId, productId)      duplicates are MERGED (quantities summed)
//   wishlist_items  unique (wishlistId, productId)  oldest kept
//   reviews         unique (userId, productId)      oldest kept
//
//   node scripts/dedupe-before-unique-indexes.mjs           -> report only
//   node scripts/dedupe-before-unique-indexes.mjs --apply   -> fix, then run `npm run prisma:push`
//
// `prisma db push` refuses to build a unique index over existing duplicates,
// so run this first. Reads DATABASE_URL from .env.local / .env.
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

async function groups(collection, keys) {
  const _id = Object.fromEntries(keys.map((k) => [k, `$${k}`]));
  return db
    .collection(collection)
    .aggregate([
      { $group: { _id, ids: { $push: '$_id' }, docs: { $push: '$$ROOT' }, n: { $sum: 1 } } },
      { $match: { n: { $gt: 1 } } },
    ])
    .toArray();
}

const byAge = (a, b) => String(a._id).localeCompare(String(b._id)); // ObjectId order = insertion order

let changes = 0;

// cart_items: keep the oldest line, add the other lines' quantities to it.
for (const g of await groups('cart_items', ['cartId', 'productId'])) {
  const [keep, ...rest] = g.docs.sort(byAge);
  const extra = rest.reduce((n, d) => n + (d.quantity ?? 0), 0);
  console.log(`cart_items cart=${g._id.cartId} product=${g._id.productId}: ${g.n} lines -> merge +${extra} into ${keep._id}`);
  if (APPLY) {
    await db.collection('cart_items').updateOne({ _id: keep._id }, { $inc: { quantity: extra } });
    await db.collection('cart_items').deleteMany({ _id: { $in: rest.map((d) => d._id) } });
  }
  changes += rest.length;
}

for (const [collection, keys] of [
  ['wishlist_items', ['wishlistId', 'productId']],
  ['reviews', ['userId', 'productId']],
]) {
  for (const g of await groups(collection, keys)) {
    const [keep, ...rest] = g.docs.sort(byAge);
    console.log(`${collection} ${JSON.stringify(g._id)}: ${g.n} rows -> keep ${keep._id}, delete ${rest.length}`);
    if (APPLY) {
      await db.collection(collection).deleteMany({ _id: { $in: rest.map((d) => d._id) } });
    }
    changes += rest.length;
  }
}

await client.close();
console.log(
  changes === 0
    ? 'No duplicates found. Safe to run `npm run prisma:push`.'
    : APPLY
      ? `Removed ${changes} duplicate row(s). Now run \`npm run prisma:push\`.`
      : `${changes} duplicate row(s) would be removed. Re-run with --apply to fix them.`
);
