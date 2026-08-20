// Stamp `emailVerified` on accounts created BEFORE signup email verification
// existed, so the new sign-in gate (auth.ts) does not lock them out. Run once
// before deploying the verification feature:
//
//   node scripts/backfill-email-verified.mjs            -> dry run: list affected users (NO DB write)
//   node scripts/backfill-email-verified.mjs --apply    -> stamp emailVerified = createdAt
//
// Users who register after the feature ships verify through the emailed link
// and are never touched by this script.
import { MongoClient } from 'mongodb';
import { readFileSync, existsSync } from 'node:fs';

const APPLY = process.argv.slice(2).includes('--apply');

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

const client = new MongoClient(url);
await client.connect();
const users = client.db().collection('users');

const pending = await users
  .find(
    { $or: [{ emailVerified: null }, { emailVerified: { $exists: false } }] },
    { projection: { email: 1, createdAt: 1 } }
  )
  .toArray();

if (pending.length === 0) {
  console.log('Nothing to do — every user already has emailVerified set.');
} else if (!APPLY) {
  console.log(`DRY RUN — ${pending.length} user(s) would be stamped verified:`);
  for (const u of pending) console.log(`  ${u.email}`);
  console.log('\nRe-run with --apply to write.');
} else {
  let stamped = 0;
  for (const u of pending) {
    await users.updateOne(
      { _id: u._id },
      { $set: { emailVerified: u.createdAt ?? new Date() } }
    );
    stamped += 1;
  }
  console.log(`Stamped emailVerified on ${stamped} user(s).`);
}

await client.close();
