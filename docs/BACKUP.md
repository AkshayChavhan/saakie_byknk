# Database Backups

Copies the whole live database into a second, independent database, on demand,
from `/admin/backup`.

- Admin UI: `/admin/backup` (dashboard → Quick Actions → Backups) — **SUPER_ADMIN only**
- Engine: `lib/server/backup.ts`
- API: `GET`/`POST /api/admin/backup`
- Download: `GET /api/admin/backup/<snapshot>/download`
- Restore: `node scripts/restore-backup.mjs` (deliberately not a button)
- Config: `BACKUP_DATABASE_URL`

---

## Snapshots, not a mirror

Every run writes a new **snapshot**. Collections land in the backup database as
`<snapshot>__<collection>`, where the snapshot is a UTC stamp:

```
20260927T101500Z__products
20260927T101500Z__orders
20260927T101500Z__users
```

This is the important design decision. A mirror — one copy, overwritten each
run — sounds simpler, but if the live database is corrupted and you then press
"backup", the corruption overwrites the only good copy you had. With snapshots
you can go back a generation.

The last **5** snapshots are kept (`SNAPSHOTS_KEPT`). Older ones are dropped
after a successful run. The snapshot just written is never a pruning candidate,
so a bug in retention cannot eat the backup it has just made.

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
  "snapshot": "20260927T101500Z",
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
| SUPER_ADMIN only | A backup reads every row, customer PII included, and writes it elsewhere |
| One run at a time | Two admins pressing the button together cannot interleave into the same snapshot. A run still `RUNNING` after 15 minutes is treated as dead, not as in progress |
| Credentials redacted | Mongo URIs carry the password inline, and driver errors quote the URI back. Everything headed for a log, an API response or the database goes through `redact()` |
| One bad collection does not abandon the run | A backup missing one collection is worth far more than no backup. The run reports `PARTIAL` and names what failed |

---

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

# List what snapshots exist in the backup database (reads only)
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
  as well if the plan offers them.
