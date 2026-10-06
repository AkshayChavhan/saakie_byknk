// The way back from Clerk to Auth.js: put the passwords Clerk has been holding
// back into the store's own `users.password` column.
//
// 1. Clerk Dashboard → Settings → User exports → "Export users" (a CSV that
//    includes each user's hashed password).
// 2. Run this against that file:
//
//   node scripts/clerk-export-to-authjs.mjs <export.csv>                  -> dry run (NO DB write)
//   node scripts/clerk-export-to-authjs.mjs <export.csv> --apply          -> write password + emailVerified
//   node scripts/clerk-export-to-authjs.mjs <export.csv> --apply --unlink -> also clear clerkId
//
// Clerk stores passwords as bcrypt, the same format Auth.js's authorize()
// compares against, so a restored customer signs in with the password they
// used on Clerk. Two groups cannot be restored and are listed at the end:
//   - users with no password (they only ever used Google/GitHub or the email
//     code) — they need a "set a password" flow, which Auth.js here never had;
//   - users whose hash is not bcrypt.
//
// The rest of the return path (restoring the Auth.js code) is in
// docs/AUTHENTICATION.md.
import { MongoClient } from 'mongodb';
import { readFileSync, existsSync } from 'node:fs';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const UNLINK = args.includes('--unlink');
const csvPath = args.find((a) => !a.startsWith('--'));

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

// RFC 4180: quoted fields may contain commas, newlines and doubled quotes.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  row.push(field);
  if (row.length > 1 || row[0] !== '') rows.push(row);
  return rows;
}

if (!csvPath || !existsSync(csvPath)) {
  console.error('Usage: node scripts/clerk-export-to-authjs.mjs <clerk-export.csv> [--apply] [--unlink]');
  process.exit(1);
}

const [header, ...rows] = parseCsv(readFileSync(csvPath, 'utf8').replace(/^﻿/, ''));
const col = (name) => header.indexOf(name);
const idCol = col('id');
const emailCol = col('primary_email_address');
const digestCol = col('password_digest');
const hasherCol = col('password_hasher');

if (idCol < 0 || emailCol < 0 || digestCol < 0 || hasherCol < 0) {
  console.error('ERROR: this does not look like a Clerk user export.');
  console.error('  Expected columns: id, primary_email_address, password_digest, password_hasher');
  console.error(`  Found: ${header.join(', ')}`);
  process.exit(1);
}

const url = readEnvUrl();
if (!url) {
  console.error('ERROR: DATABASE_URL not found in .env.local or .env');
  process.exit(1);
}

const client = new MongoClient(url);
await client.connect();
const users = client.db().collection('users');

let restored = 0;
const noPassword = [];
const otherHasher = [];
const notInStore = [];

for (const row of rows) {
  const clerkId = row[idCol];
  const email = (row[emailCol] || '').trim().toLowerCase();
  const digest = row[digestCol] || '';
  const hasher = (row[hasherCol] || '').trim().toLowerCase();

  const user =
    (await users.findOne({ clerkId }, { projection: { emailVerified: 1 } })) ||
    (email ? await users.findOne({ email }, { projection: { emailVerified: 1 } }) : null);

  if (!user) {
    notInStore.push(email || clerkId);
    continue;
  }

  const set = {};
  // Clerk verified this address, so the Auth.js sign-in gate must not lock
  // the account out for a missing stamp.
  if (!user.emailVerified) set.emailVerified = new Date();

  if (!digest) {
    noPassword.push(email);
  } else if (hasher !== 'bcrypt') {
    otherHasher.push(`${email} (${hasher || 'unknown'})`);
  } else {
    set.password = digest;
    restored += 1;
  }

  if (APPLY) {
    const update = {};
    if (Object.keys(set).length) update.$set = set;
    if (UNLINK) update.$unset = { clerkId: '' };
    if (Object.keys(update).length) await users.updateOne({ _id: user._id }, update);
  }
}

console.log(`${rows.length} Clerk user(s) in the export.`);
console.log(`  ${restored} password(s) ${APPLY ? 'restored' : 'would be restored'}`);
console.log(`  ${noPassword.length} with no password — need a way to set one after the switch`);
console.log(`  ${otherHasher.length} with a non-bcrypt hash — cannot be restored`);
console.log(`  ${notInStore.length} not found in the store database`);
for (const e of noPassword) console.log(`    no password:  ${e}`);
for (const e of otherHasher) console.log(`    other hasher: ${e}`);
for (const e of notInStore) console.log(`    not in store: ${e}`);
if (!APPLY) console.log('\nDRY RUN — nothing was written. Re-run with --apply to write.');
else if (UNLINK) console.log('\nclerkId cleared on every matched account.');

await client.close();
