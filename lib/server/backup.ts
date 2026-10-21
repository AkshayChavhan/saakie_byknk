import 'server-only'
import { MongoClient, BSON, type Document } from 'mongodb'
import prisma from '@/lib/prisma'

/**
 * Copies the whole live database into a second, independent database so the
 * shop can be rebuilt if the live one is lost.
 *
 * Each run writes a SNAPSHOT rather than overwriting a mirror: collections land
 * in the backup database as `<snapshot>__<collection>`, where `<snapshot>` is a
 * UTC stamp. That matters — a mirror refreshed over a live database that has
 * just been corrupted would copy the corruption over the only good copy. With
 * snapshots you can go back a generation.
 *
 * The backup database also keeps its own `_backup_runs` manifest. If the live
 * database is the thing that was lost, that manifest is what tells a restore
 * which snapshots exist and what was in them — the BackupRun rows in the live
 * database would be gone with everything else.
 */

/** Documents pushed per insert. Small enough to stay well inside the 16MB BSON cap. */
const BATCH_SIZE = 500

/**
 * Which snapshots the backup database keeps, applied after every successful
 * run (manual or nightly):
 *   - every snapshot from the last `dailyDays` days;
 *   - the newest snapshot of each week (Monday to Sunday, UTC) going back
 *     `weeklyWeeks` weeks;
 *   - and never fewer than the newest `minimum`, so a gap in backups (the
 *     nightly job paused, a cluster down for a week) cannot age every snapshot
 *     out and leave the backup database empty.
 * At today's size a snapshot is well under 1 MB, so this is a few MB of the
 * free cluster's 512 MB.
 */
export const RETENTION = { dailyDays: 14, weeklyWeeks: 8, minimum: 5 } as const

/** Manifest collection inside the backup database. */
export const MANIFEST_COLLECTION = '_backup_runs'

/** A run still RUNNING after this long is treated as dead, not as "in progress". */
const STALE_RUN_MS = 15 * 60 * 1000

export interface CollectionResult {
  collection: string
  documents: number
  /** Present when this collection did not copy cleanly. */
  error?: string
}

export interface BackupResult {
  ok: boolean
  snapshot: string
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED'
  targetDatabase: string | null
  collections: CollectionResult[]
  totalCollections: number
  totalDocuments: number
  durationMs: number
  /** Snapshots removed by the retention rule after this run. */
  pruned?: string[]
  error?: string
}

/**
 * Strip credentials out of anything headed for a log, an API response or the
 * database. Mongo URIs carry the password inline, and a driver error message
 * often quotes the whole URI back at you.
 */
export function redact(input: unknown): string {
  const text = input instanceof Error ? input.message : String(input ?? '')
  return text
    .replace(/mongodb(\+srv)?:\/\/[^\s"']*/gi, 'mongodb://<redacted>')
    .replace(/:\/\/[^:@/\s]+:[^@/\s]+@/g, '://<redacted>@')
}

/** Host list + database name, for comparing two connection strings. */
function identify(uri: string): { hosts: string; database: string } {
  // `mongodb+srv://user:pass@host/db?opts` — parse by hand because
  // `new URL()` mangles multi-host mongodb:// forms.
  const withoutScheme = uri.replace(/^mongodb(\+srv)?:\/\//i, '')
  const afterCredentials = withoutScheme.includes('@')
    ? withoutScheme.slice(withoutScheme.lastIndexOf('@') + 1)
    : withoutScheme
  const [hostPart, ...rest] = afterCredentials.split('/')
  const database = (rest.join('/').split('?')[0] || '').trim().toLowerCase()
  const hosts = hostPart
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .sort()
    .join(',')
  return { hosts, database }
}

/**
 * Refuse to run when the destination is the same database as the source.
 *
 * This is the guard that matters most here. Pointed at itself, a "backup" would
 * duplicate every collection into the live database under snapshot names —
 * bloating it, and leaving no backup at all.
 */
export function isSameDatabase(sourceUri: string, targetUri: string): boolean {
  const a = identify(sourceUri)
  const b = identify(targetUri)
  return a.hosts === b.hosts && a.database === b.database
}

/** UTC stamp used to name a snapshot: `20260927T101500Z`. */
export function snapshotStamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')
}

/** Collections that are backup bookkeeping rather than shop data. */
function isCopyable(name: string): boolean {
  return !name.startsWith('system.') && !name.startsWith('_backup') && !name.includes('__')
}

export class BackupConfigError extends Error {
  readonly code: string
  constructor(message: string, code: string) {
    super(message)
    this.name = 'BackupConfigError'
    this.code = code
  }
}

/** Validate configuration without connecting. Throws BackupConfigError. */
export function readBackupConfig(): { sourceUri: string; targetUri: string } {
  const sourceUri = process.env.DATABASE_URL
  const targetUri = process.env.BACKUP_DATABASE_URL

  if (!sourceUri) {
    throw new BackupConfigError('DATABASE_URL is not set.', 'NO_SOURCE')
  }
  if (!targetUri) {
    throw new BackupConfigError(
      'No backup database is configured. Set BACKUP_DATABASE_URL to a database on a separate cluster.',
      'NOT_CONFIGURED'
    )
  }
  if (isSameDatabase(sourceUri, targetUri)) {
    throw new BackupConfigError(
      'BACKUP_DATABASE_URL points at the live database. A backup must go to a different database.',
      'SAME_DATABASE'
    )
  }
  return { sourceUri, targetUri }
}

/** True when a backup is already running (and has not gone stale). */
export async function isBackupRunning(now: Date): Promise<boolean> {
  const running = await prisma.backupRun.findFirst({
    where: { status: 'RUNNING', startedAt: { gt: new Date(now.getTime() - STALE_RUN_MS) } },
    select: { id: true },
  })
  return running !== null
}

/**
 * Copy every collection into a fresh snapshot in the backup database.
 *
 * One collection failing does not abandon the run — the rest still copy and the
 * result comes back PARTIAL, because a backup missing one collection is worth
 * far more than no backup at all.
 */
export async function runBackup(options: {
  now: Date
  triggeredById?: string | null
  triggeredByEmail?: string | null
}): Promise<BackupResult> {
  const { now, triggeredById = null, triggeredByEmail = null } = options
  const { sourceUri, targetUri } = readBackupConfig()

  const snapshot = snapshotStamp(now)
  const startedMs = now.getTime()

  const run = await prisma.backupRun.create({
    data: { snapshot, status: 'RUNNING', triggeredById, triggeredByEmail, startedAt: now },
  })

  let sourceClient: MongoClient | null = null
  let targetClient: MongoClient | null = null

  try {
    sourceClient = new MongoClient(sourceUri)
    targetClient = new MongoClient(targetUri)
    await Promise.all([sourceClient.connect(), targetClient.connect()])

    const sourceDb = sourceClient.db()
    const targetDb = targetClient.db()
    const targetDatabase = targetDb.databaseName

    // Second guard, before anything is written: a backup database only ever
    // holds snapshot collections (`<stamp>__name`) and its manifest. If the
    // destination has ordinary shop collections (products, users, ...), it is
    // a live database — most likely DATABASE_URL and BACKUP_DATABASE_URL were
    // swapped — so stop rather than write snapshots into it.
    const shopCollections = (await targetDb.listCollections({}, { nameOnly: true }).toArray())
      .map((c) => c.name)
      .filter(isCopyable)
    if (shopCollections.length > 0) {
      throw new BackupConfigError(
        `The backup database already holds shop collections (${shopCollections.slice(0, 3).join(', ')}${
          shopCollections.length > 3 ? ', ...' : ''
        }), so it looks like a live database. Check that BACKUP_DATABASE_URL and DATABASE_URL are not swapped. Nothing was written.`,
        'TARGET_NOT_BACKUP'
      )
    }

    const names = (await sourceDb.listCollections({}, { nameOnly: true }).toArray())
      .map((c) => c.name)
      .filter(isCopyable)
      .sort()

    const collections: CollectionResult[] = []

    for (const name of names) {
      try {
        const destination = targetDb.collection(`${snapshot}__${name}`)
        // A snapshot name is unique per run, but a retried run in the same
        // second must not append to a half-written collection.
        await destination.deleteMany({})

        const cursor = sourceDb.collection(name).find({})
        let batch: Document[] = []
        let copied = 0

        for await (const doc of cursor) {
          batch.push(doc)
          if (batch.length >= BATCH_SIZE) {
            await destination.insertMany(batch, { ordered: false })
            copied += batch.length
            batch = []
          }
        }
        if (batch.length > 0) {
          await destination.insertMany(batch, { ordered: false })
          copied += batch.length
        }

        collections.push({ collection: name, documents: copied })
      } catch (error) {
        collections.push({ collection: name, documents: 0, error: redact(error) })
      }
    }

    const failed = collections.filter((c) => c.error)
    const totalDocuments = collections.reduce((sum, c) => sum + c.documents, 0)
    const status: BackupResult['status'] =
      failed.length === 0 ? 'SUCCESS' : failed.length === collections.length ? 'FAILED' : 'PARTIAL'
    const durationMs = Date.now() - startedMs

    // The manifest lives in the BACKUP database on purpose: it must survive the
    // live database being the thing that was lost.
    await targetDb.collection(MANIFEST_COLLECTION).insertOne({
      snapshot,
      status,
      createdAt: now,
      durationMs,
      triggeredByEmail,
      collections: collections.map((c) => ({ collection: c.collection, documents: c.documents })),
      totalCollections: collections.length,
      totalDocuments,
    })

    const pruned = status !== 'FAILED' ? await pruneSnapshots(targetClient, snapshot, now) : []

    await prisma.backupRun.update({
      where: { id: run.id },
      data: {
        status,
        targetDatabase,
        collections: collections as unknown as object,
        totalCollections: collections.length,
        totalDocuments,
        durationMs,
        finishedAt: new Date(startedMs + durationMs),
        error: failed.length > 0 ? `${failed.length} collection(s) failed to copy` : null,
      },
    })

    return {
      ok: status !== 'FAILED',
      snapshot,
      status,
      targetDatabase,
      collections,
      totalCollections: collections.length,
      totalDocuments,
      durationMs,
      pruned,
    }
  } catch (error) {
    const message = redact(error)
    const durationMs = Date.now() - startedMs
    await prisma.backupRun
      .update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          error: message,
          durationMs,
          finishedAt: new Date(startedMs + durationMs),
        },
      })
      .catch(() => undefined)

    return {
      ok: false,
      snapshot,
      status: 'FAILED',
      targetDatabase: null,
      collections: [],
      totalCollections: 0,
      totalDocuments: 0,
      durationMs,
      error: message,
    }
  } finally {
    await sourceClient?.close().catch(() => undefined)
    await targetClient?.close().catch(() => undefined)
  }
}

const DAY_MS = 24 * 60 * 60 * 1000

/** The time a snapshot stamp (`20260927T101500Z`) stands for, or null if it is not one. */
export function stampTime(stamp: string): number | null {
  const m = stamp.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/)
  if (!m) return null
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])
}

/** Monday-to-Sunday UTC week number. 1 Jan 1970 was a Thursday, hence the +3 days. */
function weekIndex(timeMs: number): number {
  return Math.floor((timeMs + 3 * DAY_MS) / (7 * DAY_MS))
}

/**
 * The snapshots RETENTION says to drop, oldest first. Pure, so it can be
 * tested on its own. The snapshot just written (`keepAtLeast`) is never
 * dropped, and anything that is not a snapshot stamp is left alone.
 */
export function snapshotsToDrop(stamps: string[], now: Date, keepAtLeast: string): string[] {
  const dated = stamps
    .map((stamp) => ({ stamp, time: stampTime(stamp) }))
    .filter((s): s is { stamp: string; time: number } => s.time !== null)
    .sort((a, b) => b.time - a.time) // newest first

  const keep = new Set<string>([keepAtLeast])
  for (const s of dated.slice(0, RETENTION.minimum)) keep.add(s.stamp)

  const weeksKept = new Set<number>()
  for (const s of dated) {
    const age = now.getTime() - s.time
    if (age <= RETENTION.dailyDays * DAY_MS) {
      keep.add(s.stamp)
    } else if (age <= RETENTION.weeklyWeeks * 7 * DAY_MS) {
      // Newest first, so the first one seen in a week is that week's newest.
      const week = weekIndex(s.time)
      if (!weeksKept.has(week)) {
        weeksKept.add(week)
        keep.add(s.stamp)
      }
    }
  }

  return dated
    .filter((s) => !keep.has(s.stamp))
    .map((s) => s.stamp)
    .sort()
}

/**
 * Drop the snapshots that fall outside RETENTION. The snapshot just written is
 * never a candidate, so a pruning bug cannot eat the backup it just made.
 */
export async function pruneSnapshots(
  client: MongoClient,
  keepAtLeast: string,
  now: Date = new Date()
): Promise<string[]> {
  const db = client.db()
  const names = (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name)

  const stamps = Array.from(
    new Set(names.filter((n) => n.includes('__')).map((n) => n.slice(0, n.indexOf('__'))))
  )

  const doomed = snapshotsToDrop(stamps, now, keepAtLeast)

  for (const stamp of doomed) {
    for (const name of names.filter((n) => n.startsWith(`${stamp}__`))) {
      await db.collection(name).drop().catch(() => undefined)
    }
    await db.collection(MANIFEST_COLLECTION).deleteMany({ snapshot: stamp }).catch(() => undefined)
  }

  return doomed
}

/** File format written by `streamSnapshotExport`, read back by the restore script. */
export const EXPORT_FORMAT = 'saakie-backup/v1'

/** Filename offered to the browser for a snapshot download. */
export function exportFilename(snapshot: string): string {
  return `saakie-backup-${snapshot}.json`
}

/**
 * Stream one snapshot out of the backup database as a single JSON file.
 *
 * Emitted as canonical MongoDB Extended JSON, so an ObjectId stays an ObjectId
 * and a Date stays a Date instead of decaying into strings — the difference
 * between a file you can restore from and a file you can only look at.
 *
 * Built a document at a time rather than assembled in memory: the whole point
 * of this file is that it works when the shop is at its largest, which is
 * exactly when holding it all in one string would fail.
 */
export async function* streamSnapshotExport(
  snapshot: string,
  now: Date
): AsyncGenerator<string> {
  const { targetUri } = readBackupConfig()
  const client = new MongoClient(targetUri)

  try {
    await client.connect()
    const db = client.db()

    const names = (await db.listCollections({}, { nameOnly: true }).toArray())
      .map((c) => c.name)
      .filter((n) => n.startsWith(`${snapshot}__`))
      .sort()

    if (names.length === 0) {
      throw new BackupConfigError(`Snapshot "${snapshot}" was not found.`, 'NO_SNAPSHOT')
    }

    yield `{\n  "format": ${JSON.stringify(EXPORT_FORMAT)},\n` +
      `  "snapshot": ${JSON.stringify(snapshot)},\n` +
      `  "exportedAt": ${JSON.stringify(now.toISOString())},\n` +
      `  "database": ${JSON.stringify(db.databaseName)},\n` +
      `  "collections": {`

    let firstCollection = true
    for (const name of names) {
      const collection = name.slice(snapshot.length + 2)
      yield `${firstCollection ? '' : ','}\n    ${JSON.stringify(collection)}: [`
      firstCollection = false

      let firstDoc = true
      for await (const doc of db.collection(name).find({})) {
        yield `${firstDoc ? '' : ','}\n      ${BSON.EJSON.stringify(doc, { relaxed: false })}`
        firstDoc = false
      }
      yield firstDoc ? ']' : '\n    ]'
    }

    yield '\n  }\n}\n'
  } finally {
    await client.close().catch(() => undefined)
  }
}
