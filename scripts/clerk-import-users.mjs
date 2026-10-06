// Copy the store's existing accounts into Clerk — WITH their bcrypt password
// hashes — so customers keep signing in with the password they already have.
// Run once, after the Clerk keys are in .env.local and before sending real
// customers to the Clerk sign-in page:
//
//   node scripts/clerk-import-users.mjs            -> dry run: counts only (NO writes anywhere)
//   node scripts/clerk-import-users.mjs --apply    -> create the Clerk users, store each clerkId
//
// Which Clerk instance receives them is decided by CLERK_SECRET_KEY: an
// `sk_test_` key fills the development instance, `sk_live_` the production one.
//
// Only accounts with a confirmed email are imported. Clerk marks an imported
// address as verified, so importing an unconfirmed one would hand a working
// login to whoever registered it without ever proving they own the mailbox.
// Those people simply sign up again; the app links them back by email.
//
// Safe to re-run: accounts that already carry a clerkId are skipped, and an
// email Clerk already knows is linked instead of created twice.
import { MongoClient } from 'mongodb';
import { readFileSync, existsSync } from 'node:fs';

const APPLY = process.argv.slice(2).includes('--apply');
const CLERK_API = 'https://api.clerk.com/v1';
const BCRYPT_RE = /^\$2[aby]\$\d{2}\$.{53}$/;

function readEnv(name) {
  if (process.env[name]) return process.env[name];
  for (const file of ['.env.local', '.env']) {
    if (!existsSync(file)) continue;
    for (const raw of readFileSync(file, 'utf8').split('\n')) {
      const line = raw.trim();
      if (line.startsWith('#') || !line.startsWith(`${name}=`)) continue;
      let v = line.slice(line.indexOf('=') + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (v) return v;
    }
  }
  return null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const url = readEnv('DATABASE_URL');
if (!url) {
  console.error('ERROR: DATABASE_URL not found in .env.local or .env');
  process.exit(1);
}
const secretKey = readEnv('CLERK_SECRET_KEY');
if (APPLY && !secretKey) {
  console.error('ERROR: CLERK_SECRET_KEY not found in .env.local or .env');
  process.exit(1);
}

async function clerk(method, path, body) {
  for (;;) {
    const res = await fetch(`${CLERK_API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429) {
      await sleep((Number(res.headers.get('retry-after')) || 5) * 1000);
      continue;
    }
    const json = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, json };
  }
}

function splitName(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  return { first_name: parts[0], last_name: parts.slice(1).join(' ') || undefined };
}

const client = new MongoClient(url);
await client.connect();
const users = client.db().collection('users');

const unlinked = { $or: [{ clerkId: null }, { clerkId: { $exists: false } }] };
const candidates = await users
  .find(unlinked, { projection: { email: 1, name: 1, password: 1, emailVerified: 1, createdAt: 1 } })
  .toArray();

const ready = candidates.filter((u) => u.email && u.emailVerified);
const unverified = candidates.length - ready.length;
const withPassword = ready.filter((u) => BCRYPT_RE.test(u.password || '')).length;

console.log(`${candidates.length} account(s) not yet in Clerk:`);
console.log(`  ${ready.length} to import (${withPassword} with a password, ${ready.length - withPassword} without)`);
console.log(`  ${unverified} skipped — email never confirmed`);

if (!APPLY) {
  console.log('\nDRY RUN — nothing was written. Re-run with --apply to import.');
  await client.close();
  process.exit(0);
}

console.log(`\nImporting into the ${secretKey.startsWith('sk_live_') ? 'PRODUCTION' : 'development'} Clerk instance…`);

let created = 0;
let linked = 0;
const failed = [];

for (const u of ready) {
  const email = u.email.trim().toLowerCase();
  const hasPassword = BCRYPT_RE.test(u.password || '');

  const res = await clerk('POST', '/users', {
    external_id: String(u._id),
    email_address: [email],
    ...splitName(u.name),
    ...(hasPassword
      ? { password_digest: u.password, password_hasher: 'bcrypt' }
      : { skip_password_requirement: true }),
    skip_legal_checks: true,
    ...(u.createdAt ? { created_at: new Date(u.createdAt).toISOString() } : {}),
  });

  let clerkId = res.ok ? res.json?.id : null;

  // Clerk already has this address (an earlier partial run, or the customer
  // signed up there first) — link to that user rather than fail.
  if (!clerkId && res.json?.errors?.some((e) => e.code === 'form_identifier_exists')) {
    const found = await clerk('GET', `/users?email_address=${encodeURIComponent(email)}`);
    clerkId = Array.isArray(found.json) ? found.json[0]?.id : null;
    if (clerkId) linked += 1;
  } else if (clerkId) {
    created += 1;
  }

  if (!clerkId) {
    failed.push(`${email}: ${res.json?.errors?.[0]?.long_message || res.json?.errors?.[0]?.message || `HTTP ${res.status}`}`);
    continue;
  }

  await users.updateOne({ _id: u._id }, { $set: { clerkId } });
  await sleep(150);
}

console.log(`Created ${created}, linked ${linked} existing, failed ${failed.length}.`);
for (const line of failed) console.log(`  FAILED ${line}`);

await client.close();
process.exit(failed.length ? 1 : 0);
