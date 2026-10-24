# Database Backups

Copies the whole live database into a second, independent database: every
night automatically, and on demand from `/admin/backup`.

- Nightly: `.github/workflows/nightly-backup.yml` → `pnpm backup:nightly` (`scripts/backup-nightly.ts`)
- Admin UI: `/admin/backup` (dashboard → Quick Actions → Backups) — **SUPER_ADMIN only**
- Engine: `lib/server/backup.ts`
- API: `GET`/`POST /api/admin/backup`
- Download: `GET /api/admin/backup/<snapshot>/download`
- Restore: `node scripts/restore-backup.mjs` (deliberately not a button)
- Config: `BACKUP_DATABASE_URL`

---

## Snapshots, not a mirror

Every run writes a new **snapshot**: one collection in the backup database,
named after the **India time** (IST, UTC+5:30) the run started, holding every
document of every shop collection:

```
saakie_backup
  _backup_runs                    list of all snapshots (the manifest)
  backup_20261024T104500IST       one backup: 24 Oct 2026, 10:45:00 AM India time
  backup_20261025T050130IST       the next one: 25 Oct, 5:01:30 AM
```

Read the name as `date T time IST`. Snapshots taken before 24 Oct 2026 end in
`Z` instead (UTC, for example `backup_20261023T232114Z`); add 5 hours 30
minutes to read those as India time. Both endings are read, downloaded,
restored and pruned the same way, and they sort in time order together.

Inside a snapshot, each record says which shop collection it came from:

```
{ collection: "products", data: { name: "Manika", price: 7650, ... } }
{ collection: "orders",   data: { orderNumber: "ORD-…", total: 2350, ... } }
```

To look at one shop collection inside a backup in Atlas's Data Explorer, type
`{ collection: "products" }` in the filter box (the field is indexed).

**Why one collection per backup:** the backup database reads as a tidy list of
dated backups, and it stays far below the free Atlas plan's limit of 500
collections per cluster. One collection per *shop* collection per backup
(about 22 × 22 with nightly runs) would have reached that limit and made
backups fail.

**The first layout is still supported.** Snapshots taken before this change
are stored as one collection per shop collection (`20261021T125504Z__products`,
`20261021T125504Z__orders`, ...). Download, restore and retention read both
layouts, so those snapshots stay usable until the retention rule removes them.

This is the important design decision. A mirror — one copy, overwritten each
run — sounds simpler, but if the live database is corrupted and you then press
"backup", the corruption overwrites the only good copy you had. With snapshots
you can go back a generation.

### Which snapshots are kept

After every successful run, manual or nightly, the backup database keeps
(`RETENTION` in `lib/server/backup.ts`):

| Rule | Kept |
|---|---|
| Last 14 days | every snapshot |
| 2 to 8 weeks back | the newest snapshot of each week (Monday to Sunday, UTC) |
| Always | at least the newest 5, however old |

Everything else is dropped. With nightly runs that is about 22 snapshots; at
today's size (well under 1 MB each) a few MB of the free cluster's 512 MB.

The "at least 5" rule matters: if backups stop for a while (the nightly job
paused, a cluster down), a purely time-based rule would age every snapshot out
and leave nothing. The snapshot just written is never a pruning candidate
either, so a bug in retention cannot eat the backup it has just made. The rule
is a pure function (`snapshotsToDrop`) with its own tests.

## The manifest lives in the backup database

Each run also appends to `_backup_runs` **inside the backup database**, listing
the snapshot, its status, and the document count per collection.

That placement is the point: if the live database is the thing that was lost,
the `BackupRun` rows in it are gone too. The manifest in the backup database is
what tells a restore which snapshots exist and what should be in them. The
`BackupRun` rows in the live database are just a convenient local mirror for the
admin page.

---

## Three copies, not two

Pressing **Back up now** produces two things:

1. A **snapshot in the backup database** — survives losing the live cluster.
2. A **file downloaded to the computer that pressed the button** — survives
   losing access to *both* clusters: a billing lapse, a locked-out Atlas
   account, a provider outage, a deleted project.

The download starts by itself once the copy finishes. Every past snapshot also
has a **Download** button in the history list, so you can pull an older one at
any time.

### The file

`saakie-backup-<snapshot>.json`, one JSON document:

```json
{
  "format": "saakie-backup/v1",
  "snapshot": "20260927T154500IST",
  "exportedAt": "2026-09-27T12:00:00.000Z",
  "database": "saakie_backup",
  "collections": {
    "products": [ … ],
    "orders":   [ … ]
  }
}
```

Written as **canonical MongoDB Extended JSON**, so an `ObjectId` stays an
`ObjectId` and a `Date` stays a `Date`:

```json
{ "_id": { "$oid": "507f1f77bcf86cd799439011" },
  "createdAt": { "$date": { "$numberLong": "1790000000000" } } }
```

Plain `JSON.stringify` would turn both into strings, and every `_id` would be
corrupt on the way back in. That is the difference between a file you can
restore from and a file you can only look at.

It is read out of the **backup database**, not the live one, so the file is the
same bytes as the snapshot it names rather than a fresh read of a database that
has moved on. It is streamed rather than buffered — the response holds the whole
shop, and building a `Content-Length` for it would fail exactly when the shop is
big enough for the download to matter.

> **This file is every customer record you hold** — names, phone numbers,
> addresses, order history. Treat it like the database it is: keep it
> encrypted, off shared drives, and delete old copies.

---

## Safety guards

| Guard | Why |
|---|---|
| `BACKUP_DATABASE_URL` required | No silent no-op backups |
| **Refuses if it resolves to the live database** | Pointed at itself, a "backup" would duplicate every collection back into the live database and leave no backup at all. Compared on host list + database name, so different credentials for the same cluster are still caught |
| **Refuses to write into a database that holds shop collections** | A backup database only ever contains `<stamp>__name` snapshots and `_backup_runs`. If the destination has `products`, `users`, ... it is a live database — typically the two connection strings swapped — so the run stops before writing anything and says so |
| SUPER_ADMIN only | A backup reads every row, customer PII included, and writes it elsewhere |
| One run at a time | Two admins pressing the button together cannot interleave into the same snapshot. A run still `RUNNING` after 15 minutes is treated as dead, not as in progress |
| Credentials redacted | Mongo URIs carry the password inline, and driver errors quote the URI back. Everything headed for a log, an API response or the database goes through `redact()` |
| One bad collection does not abandon the run | A backup missing one collection is worth far more than no backup. The run reports `PARTIAL` and names what failed |

---

## Nightly backups (automatic)

A GitHub Actions job runs every night at **02:00 India time** (20:30 UTC) and
does exactly what the admin button does: a new snapshot in the backup
database, then the retention rule. It runs on GitHub's machines, so the host's
short serverless time limit does not apply.

### Turning it on

1. Set up the backup database first (next section, steps 1 and 2).
2. **Atlas network access:** GitHub's machines have no fixed address, so both
   clusters (live and backup) must accept connections from anywhere
   (`0.0.0.0/0` in Atlas → Network Access). The live cluster almost certainly
   already does, because the website's host has no fixed address either. The
   password in each connection string remains the real lock.
3. In GitHub: **repository → Settings → Secrets and variables → Actions → New
   repository secret**, add:
   - `DATABASE_URL` — the live database (same value as the website's)
   - `BACKUP_DATABASE_URL` — the backup database
4. **Actions tab → Nightly backup → Run workflow** to run it once now. It
   should finish green, and the run appears in `/admin/backup` as
   "by nightly (GitHub Actions)".

### Knowing it worked

- A failed or partial run turns the job red and GitHub **emails** the account
  that last edited the workflow's schedule.
- Every run, nightly or manual, is listed in `/admin/backup` with its status
  and document counts.
- Once a month, restore one snapshot into a scratch database (see Restoring) to
  prove the backups actually restore.

### Things to know

- **The logs are public** while the repository is public. The script prints
  counts, statuses, collection names and already-redacted errors only — never
  a document or a connection string — and GitHub masks the secret values
  themselves. `NODE_ENV=production` in the workflow keeps Prisma from logging
  queries; do not change it.
- **GitHub pauses scheduled jobs in a public repository after 60 days without
  a commit.** It emails a warning first; any commit (or the "Enable workflow"
  button in the Actions tab) starts it again. Private repositories are not
  paused.
- **Forks never run it** (the job checks the repository name), and the job has
  read-only access to the code.
- A scheduled run can start some minutes late when GitHub is busy.
- **Running it by hand** from a computer:

  ```
  pnpm exec tsx --env-file=.env.local --tsconfig tsconfig.scripts.json scripts/backup-nightly.ts
  ```

  (`.env.local` needs `BACKUP_DATABASE_URL`.) The script runs the shop's own
  server code; `tsconfig.scripts.json` stands in for Next.js's `server-only`
  marker, which only Next.js provides.

## Setting it up

1. Create a database **on a separate cluster** from the live one. Separate is
   the whole point — a backup sharing a cluster dies with it. A second free
   MongoDB Atlas project works.
2. Create a user on that cluster with read/write on the backup database.
3. Set the connection string:

   ```
   BACKUP_DATABASE_URL=mongodb+srv://user:pass@backup-cluster.mongodb.net/saakie_backup
   ```

   Locally in `.env.local`; in production, in the host's environment settings.
4. `pnpm prisma:push` once, so `backup_runs` exists in the live database.
5. Open `/admin/backup` as a SUPER_ADMIN and press **Back up now**.

The backup database needs no schema and no `prisma db push` — collections are
created as they are written.

---

## Restoring

Restoring is a command-line script on purpose. Backing up is safe and
reversible; restoring overwrites live data, and a misclick would replace a
working shop with an older copy of itself.

```bash
# Restore from a downloaded file — needs only DATABASE_URL, so this is the
# path when the backup cluster is unreachable too
node scripts/restore-backup.mjs --file ~/Downloads/saakie-backup-20260927T101500Z.json
node scripts/restore-backup.mjs --file ~/Downloads/saakie-backup-20260927T101500Z.json --apply

# List what snapshots exist in the backup database (reads only; both layouts)
node scripts/restore-backup.mjs

# Show what WOULD change, without writing
node scripts/restore-backup.mjs --snapshot 20260927T101500Z

# Actually restore — asks you to type the live database name to confirm
node scripts/restore-backup.mjs --snapshot 20260927T101500Z --apply
```

`--apply` replaces each collection present in the backup. Collections that
exist live but are **not** in the snapshot are left alone, never dropped.

Restart the app afterwards so nothing is serving cached data.

---

## Limits worth knowing

- **Serverless timeout.** The route asks for `maxDuration = 300`, but the host
  caps it — 60s on a Vercel Hobby plan. A run cut short leaves a `RUNNING` row
  that goes stale after 15 minutes, and a partial snapshot that the next run
  supersedes. If the shop outgrows the window, run the copy from a machine you
  control rather than a serverless function.
- **Not a point-in-time backup.** Collections are copied one after another, so
  a write landing mid-run can be caught in one collection and missed in
  another. For a shop this size the window is seconds; it is not a substitute
  for your database provider's own continuous backups.
- **This is a second line of defence**, not the first. Keep Atlas backups on
  as well if the plan offers them (the free plan does not).
- **One copy, one provider.** Nightly snapshots live in a second Atlas cluster.
  If the Atlas account itself were lost, the files downloaded by the admin
  button are the copy that survives; take one now and then.
