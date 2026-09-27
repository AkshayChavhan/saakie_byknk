// Restore the live database from a backup — either a snapshot in the backup
// database, or a backup file downloaded from /admin/backup.
//
//   node scripts/restore-backup.mjs                                      -> list snapshots (reads only)
//   node scripts/restore-backup.mjs --snapshot 20260927T101500Z          -> dry run from the backup DB
//   node scripts/restore-backup.mjs --snapshot 20260927T101500Z --apply  -> RESTORE from the backup DB
//   node scripts/restore-backup.mjs --file ~/Downloads/saakie-backup-20260927T101500Z.json
//   node scripts/restore-backup.mjs --file ~/Downloads/saakie-backup-...json --apply
//
// This is deliberately a command-line script and not a button in the admin UI.
// Backing up is safe and reversible; restoring overwrites live data, and a
// misclick would replace a working shop with an older copy of itself. Making
// someone open a terminal and type a snapshot id is the point.
//
// --apply replaces each collection present in the backup. Collections that
// exist live but are NOT in the backup are LEFT ALONE, never dropped.
//
// --file needs only DATABASE_URL: it is the path you use when the backup
// cluster is unreachable too, and all you still have is the downloaded file.
import { MongoClient, BSON } from 'mongodb';
import { readFileSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const valueOf = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};
const SNAPSHOT = valueOf('--snapshot');
const FILE = valueOf('--file');
const MANIFEST = '_backup_runs';
const EXPORT_FORMAT = 'saakie-backup/v1';

function readEnv(key) {
  for (const file of ['.env.local', '.env']) {
    if (!existsSync(file)) continue;
    for (const raw of readFileSync(file, 'utf8').split('\n')) {
      const line = raw.trim();
      if (line.startsWith('#') || !line.startsWith(`${key}=`)) continue;
      let v = line.slice(line.indexOf('=') + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (v) return v;
    }
  }
  return process.env[key] || null;
}

if (SNAPSHOT && FILE) {
  console.error('ERROR: pass --snapshot or --file, not both.');
  process.exit(1);
}

const sourceUrl = readEnv('DATABASE_URL');
if (!sourceUrl) { console.error('ERROR: DATABASE_URL not found.'); process.exit(1); }

// --file restores without ever touching the backup cluster, which is the whole
// point of having the file.
const backupUrl = FILE ? null : readEnv('BACKUP_DATABASE_URL');
if (!FILE && !backupUrl) {
  console.error('ERROR: BACKUP_DATABASE_URL not found. (Restoring a downloaded file? Use --file.)');
  process.exit(1);
}

const live = new MongoClient(sourceUrl);
const backup = backupUrl ? new MongoClient(backupUrl) : null;

/** Read a downloaded backup file into { snapshot, collections: {name: docs[]} }. */
function loadFile(path) {
  if (!existsSync(path)) {
    console.error(`ERROR: file not found: ${path}`);
    process.exit(1);
  }
  let parsed;
  try {
    // Canonical Extended JSON, so ObjectIds and Dates come back as real types
    // rather than strings — without this the restore would corrupt every _id.
    parsed = BSON.EJSON.parse(readFileSync(path, 'utf8'), { relaxed: false });
  } catch (error) {
    console.error(`ERROR: could not parse ${path}: ${error.message}`);
    process.exit(1);
  }
  if (parsed?.format !== EXPORT_FORMAT) {
    console.error(`ERROR: not a Saakie backup file (expected format "${EXPORT_FORMAT}").`);
    process.exit(1);
  }
  return { snapshot: parsed.snapshot, collections: parsed.collections ?? {} };
}

try {
  await live.connect();
  if (backup) await backup.connect();
  const liveDb = live.db();
  const backupDb = backup?.db() ?? null;

  if (backupDb && liveDb.databaseName === backupDb.databaseName) {
    console.error('ERROR: live and backup point at the same database. Refusing.');
    process.exit(1);
  }

  // ---- list mode -----------------------------------------------------------
  if (!SNAPSHOT && !FILE) {
    const names = (await backupDb.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name);
    const stamps = [...new Set(names.filter((n) => n.includes('__')).map((n) => n.slice(0, n.indexOf('__'))))].sort().reverse();
    console.log(`\nSnapshots in "${backupDb.databaseName}":\n`);
    if (stamps.length === 0) {
      console.log('  (none — run a backup from /admin/backup first)\n');
    } else {
      const manifest = await backupDb.collection(MANIFEST).find({}).toArray();
      for (const stamp of stamps) {
        const entry = manifest.find((m) => m.snapshot === stamp);
        const count = names.filter((n) => n.startsWith(`${stamp}__`)).length;
        console.log(`  ${stamp}  ${count} collections  ${entry ? `${entry.totalDocuments} docs  ${entry.status}` : ''}`);
      }
      console.log(`\nRestore one with:\n  node scripts/restore-backup.mjs --snapshot ${stamps[0]} --apply\n`);
    }
    process.exit(0);
  }

  // ---- build the plan ------------------------------------------------------
  const plan = [];
  let label;

  if (FILE) {
    const { snapshot, collections } = loadFile(FILE);
    label = `file ${FILE} (snapshot ${snapshot})`;
    for (const [target, docs] of Object.entries(collections).sort(([a], [b]) => a.localeCompare(b))) {
      const current = await liveDb.collection(target).countDocuments().catch(() => 0);
      plan.push({ target, docs, incoming: docs.length, current });
    }
  } else {
    const names = (await backupDb.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name);
    const mine = names.filter((n) => n.startsWith(`${SNAPSHOT}__`)).sort();
    if (mine.length === 0) {
      console.error(`ERROR: snapshot "${SNAPSHOT}" not found. Run without --snapshot to list.`);
      process.exit(1);
    }
    label = `snapshot ${SNAPSHOT} in ${backupDb.databaseName}`;
    for (const name of mine) {
      const target = name.slice(SNAPSHOT.length + 2);
      const incoming = await backupDb.collection(name).countDocuments();
      const current = await liveDb.collection(target).countDocuments().catch(() => 0);
      plan.push({ target, sourceCollection: name, incoming, current });
    }
  }

  console.log(`\n${APPLY ? 'RESTORING' : 'DRY RUN'} from ${label}`);
  console.log(`  into LIVE : ${liveDb.databaseName}\n`);
  for (const { target, incoming, current } of plan) {
    console.log(`  ${target.padEnd(24)} live ${String(current).padStart(7)}  ->  ${String(incoming).padStart(7)}`);
  }

  if (!APPLY) {
    console.log('\nDry run only — nothing was written. Re-run with --apply to restore.\n');
    process.exit(0);
  }

  console.log('\n*** THIS REPLACES THE COLLECTIONS LISTED ABOVE IN THE LIVE DATABASE. ***');
  console.log('*** Collections not in the backup are left untouched.                 ***\n');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`Type the database name "${liveDb.databaseName}" to confirm: `);
  rl.close();
  if (answer.trim() !== liveDb.databaseName) {
    console.error('\nDid not match. Nothing was changed.\n');
    process.exit(1);
  }

  for (const entry of plan) {
    const docs = entry.docs ?? (await backupDb.collection(entry.sourceCollection).find({}).toArray());
    await liveDb.collection(entry.target).deleteMany({});
    for (let i = 0; i < docs.length; i += 500) {
      const slice = docs.slice(i, i + 500);
      if (slice.length > 0) await liveDb.collection(entry.target).insertMany(slice, { ordered: false });
    }
    console.log(`  restored ${entry.target} (${docs.length})`);
  }
  console.log('\nDone. Restart the app so nothing is serving cached data.\n');
} finally {
  await live.close().catch(() => {});
  await backup?.close().catch(() => {});
}
