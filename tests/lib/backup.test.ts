import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockPrisma = {
  backupRun: {
    create: vi.fn(),
    update: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma, default: mockPrisma }))

/** An in-memory stand-in for the bits of the Mongo driver the backup uses. */
function makeDb(collections: Record<string, unknown[]>, databaseName: string) {
  const written: Record<string, unknown[]> = {}
  const dropped: string[] = []
  const indexes: string[] = []
  /** Top-level equality match, the only kind of filter the backup uses. */
  const matches = (doc: unknown, filter: Record<string, unknown> = {}) =>
    Object.entries(filter).every(([k, v]) => (doc as Record<string, unknown>)[k] === v)
  const db = {
    databaseName,
    listCollections: () => ({
      toArray: async () => Object.keys(collections).map((name) => ({ name })),
    }),
    collection: (name: string) => ({
      find: (filter: Record<string, unknown> = {}) => {
        const docs = (collections[name] ?? []).filter((d) => matches(d, filter))
        return {
          [Symbol.asyncIterator]: async function* () {
            for (const doc of docs) yield doc
          },
          toArray: async () => docs,
        }
      },
      distinct: async (field: string) =>
        Array.from(new Set((collections[name] ?? []).map((d) => (d as Record<string, unknown>)[field]))),
      insertMany: async (docs: unknown[]) => {
        written[name] = [...(written[name] ?? []), ...docs]
        return { insertedCount: docs.length }
      },
      insertOne: async (doc: unknown) => {
        written[name] = [...(written[name] ?? []), doc]
        return { insertedId: 'x' }
      },
      deleteMany: async (filter: Record<string, unknown> = {}) => {
        const before = written[name] ?? []
        written[name] = before.filter((d) => !matches(d, filter))
        return { deletedCount: before.length - written[name].length }
      },
      createIndex: async (spec: Record<string, number>) => {
        indexes.push(`${name}:${Object.keys(spec).join(',')}`)
        return 'idx'
      },
      drop: async () => {
        dropped.push(name)
      },
    }),
  }
  return { db, written, dropped, indexes }
}

const clients: Array<{ uri: string; db: unknown }> = []

vi.mock('mongodb', async () => {
  const actual = await vi.importActual<typeof import('mongodb')>('mongodb')
  return {
  BSON: actual.BSON,
  ObjectId: actual.ObjectId,
  MongoClient: class {
    uri: string
    constructor(uri: string) {
      this.uri = uri
    }
    async connect() {
      return this
    }
    db() {
      return clients.find((c) => c.uri === this.uri)?.db
    }
    async close() {}
  },
  }
})

const LIVE = 'mongodb+srv://u:p@live.mongodb.net/saakie'
const BACKUP = 'mongodb+srv://u:p@backup.mongodb.net/saakie_backup'

const load = () => import('@/lib/server/backup')

describe('lib/server/backup', () => {
  const env = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    clients.length = 0
    process.env.DATABASE_URL = LIVE
    process.env.BACKUP_DATABASE_URL = BACKUP
    mockPrisma.backupRun.create.mockResolvedValue({ id: 'run_1' })
    mockPrisma.backupRun.update.mockResolvedValue({})
    mockPrisma.backupRun.findFirst.mockResolvedValue(null)
  })

  afterEach(() => {
    process.env = { ...env }
  })

  describe('redact', () => {
    it('strips a mongodb URI out of an error message', async () => {
      const { redact } = await load()
      const message = redact(new Error(`connect failed to ${BACKUP}`))

      expect(message).not.toContain('backup.mongodb.net')
      expect(message).not.toContain(':p@')
      expect(message).toContain('<redacted>')
    })

    it('strips inline credentials from any URI form', async () => {
      const { redact } = await load()

      expect(redact('postgres://admin:hunter2@db/x')).not.toContain('hunter2')
    })
  })

  describe('isSameDatabase', () => {
    it('is false for genuinely different clusters', async () => {
      const { isSameDatabase } = await load()

      expect(isSameDatabase(LIVE, BACKUP)).toBe(false)
    })

    it('catches a backup URL pointed at the live database', async () => {
      const { isSameDatabase } = await load()

      expect(isSameDatabase(LIVE, LIVE)).toBe(true)
    })

    it('catches the same database behind different credentials', async () => {
      const { isSameDatabase } = await load()

      expect(
        isSameDatabase(LIVE, 'mongodb+srv://other:secret@live.mongodb.net/saakie')
      ).toBe(true)
    })

    it('ignores host case and query options', async () => {
      const { isSameDatabase } = await load()

      expect(
        isSameDatabase(LIVE, 'mongodb+srv://u:p@LIVE.mongodb.net/saakie?retryWrites=true')
      ).toBe(true)
    })

    it('treats a different database on the same cluster as different', async () => {
      const { isSameDatabase } = await load()

      expect(isSameDatabase(LIVE, 'mongodb+srv://u:p@live.mongodb.net/saakie_backup')).toBe(false)
    })
  })

  describe('readBackupConfig', () => {
    it('refuses when no backup database is configured', async () => {
      delete process.env.BACKUP_DATABASE_URL
      const { readBackupConfig } = await load()

      expect(() => readBackupConfig()).toThrowError(/backup database is configured/i)
    })

    it('refuses when the backup URL is the live database', async () => {
      process.env.BACKUP_DATABASE_URL = LIVE
      const { readBackupConfig } = await load()

      expect(() => readBackupConfig()).toThrowError(/live database/i)
    })

    it('accepts a genuinely separate database', async () => {
      const { readBackupConfig } = await load()

      expect(readBackupConfig()).toEqual({ sourceUri: LIVE, targetUri: BACKUP })
    })
  })

  describe('snapshotStamp', () => {
    it('is a compact sortable UTC stamp', async () => {
      const { snapshotStamp } = await load()

      expect(snapshotStamp(new Date('2026-09-27T10:15:00.000Z'))).toBe('20260927T101500Z')
    })

    it('sorts chronologically as a plain string', async () => {
      const { snapshotStamp } = await load()
      const earlier = snapshotStamp(new Date('2026-09-27T10:15:00Z'))
      const later = snapshotStamp(new Date('2026-09-27T11:00:00Z'))

      expect([later, earlier].sort()).toEqual([earlier, later])
    })
  })

  describe('retention', () => {
    // A Wednesday evening; stamps below are relative to it.
    const now = new Date('2026-10-21T20:30:00.000Z')
    const stamp = (daysAgo: number) =>
      new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d+Z$/, 'Z')

    it('reads a snapshot stamp back into a time, and rejects anything else', async () => {
      const { stampTime } = await load()
      expect(stampTime('20260927T101500Z')).toBe(Date.UTC(2026, 8, 27, 10, 15, 0))
      expect(stampTime('saakie_backup')).toBeNull()
    })

    it('keeps every snapshot from the last 14 days', async () => {
      const { snapshotsToDrop } = await load()
      const recent = Array.from({ length: 14 }, (_, i) => stamp(i + 0.5))

      expect(snapshotsToDrop(recent, now, recent[0])).toEqual([])
    })

    it('keeps only the newest of each week between 2 and 8 weeks back', async () => {
      const { snapshotsToDrop } = await load()
      // Daily snapshots 15 to 56 days old, plus the newest 5 to satisfy the minimum.
      const recent = [0.5, 1.5, 2.5, 3.5, 4.5].map(stamp)
      const older = Array.from({ length: 42 }, (_, i) => stamp(i + 15))

      const dropped = snapshotsToDrop([...recent, ...older], now, recent[0])
      const kept = older.filter((s) => !dropped.includes(s))

      // Between 6 and 7 weeks are touched in that window, one survivor each.
      expect(kept.length).toBeGreaterThanOrEqual(6)
      expect(kept.length).toBeLessThanOrEqual(7)
      const weeks = new Set(kept.map((s) => Math.floor((Date.parse(s.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z')) + 3 * 86400000) / (7 * 86400000))))
      expect(weeks.size).toBe(kept.length)
      expect(dropped.some((s) => recent.includes(s))).toBe(false)
    })

    it('drops snapshots older than 8 weeks once enough newer ones exist', async () => {
      const { snapshotsToDrop } = await load()
      const recent = [1, 2, 3, 4, 5].map(stamp)
      const ancient = [70, 90].map(stamp)

      expect(snapshotsToDrop([...recent, ...ancient], now, recent[0])).toEqual([...ancient].sort())
    })

    it('never leaves fewer than 5, even after a long gap in backups', async () => {
      const { snapshotsToDrop } = await load()
      const allOld = [100, 101, 102, 103, 104, 105].map(stamp)

      // Only the oldest goes; the newest five survive although all are past 8 weeks.
      expect(snapshotsToDrop(allOld, now, allOld[0])).toEqual([stamp(105)])
    })

    it('never drops the snapshot just written, and ignores names that are not stamps', async () => {
      const { snapshotsToDrop } = await load()
      const recent = [1, 2, 3, 4, 5].map(stamp)
      const justWritten = stamp(200)

      const dropped = snapshotsToDrop([...recent, justWritten, 'not-a-stamp'], now, justWritten)

      expect(dropped).not.toContain(justWritten)
      expect(dropped).not.toContain('not-a-stamp')
    })

    it('removes a dropped snapshot\'s collections and its manifest entry', async () => {
      const { pruneSnapshots } = await load()
      const recent = [1, 2, 3, 4, 5].map(stamp)
      const old = stamp(90)
      const backup = makeDb(
        Object.fromEntries([...recent, old].flatMap((st) => [[`${st}__products`, []], [`${st}__orders`, []]])),
        'saakie_backup'
      )

      const pruned = await pruneSnapshots({ db: () => backup.db } as never, recent[0], now)

      expect(pruned).toEqual([old])
      expect(backup.dropped.sort()).toEqual([`${old}__orders`, `${old}__products`])
    })
  })

  describe('runBackup', () => {
    const now = new Date('2026-09-27T10:15:00.000Z')
    const SNAP = '20260927T101500Z'

    function wire(source: Record<string, unknown[]>) {
      const src = makeDb(source, 'saakie')
      const dst = makeDb({}, 'saakie_backup')
      clients.push({ uri: LIVE, db: src.db }, { uri: BACKUP, db: dst.db })
      return { src, dst }
    }

    it('copies every document into one collection named after the snapshot', async () => {
      const { dst } = wire({
        products: [{ _id: 1 }, { _id: 2 }],
        orders: [{ _id: 3 }],
      })
      const { runBackup } = await load()

      const result = await runBackup({ now })

      expect(result.status).toBe('SUCCESS')
      expect(result.totalDocuments).toBe(3)
      expect(result.totalCollections).toBe(2)
      // One backup = one collection, each record tagged with where it came from.
      expect(Object.keys(dst.written).filter((n) => n.startsWith('backup_'))).toEqual([`backup_${SNAP}`])
      expect(dst.written[`backup_${SNAP}`]).toEqual([
        { collection: 'orders', data: { _id: 3 } },
        { collection: 'products', data: { _id: 1 } },
        { collection: 'products', data: { _id: 2 } },
      ])
      // Indexed on the collection name for restores and Atlas's filter box.
      expect(dst.indexes).toContain(`backup_${SNAP}:collection`)
    })

    it('writes its manifest into the BACKUP database, not the live one', async () => {
      const { dst } = wire({ products: [{ _id: 1 }] })
      const { runBackup, MANIFEST_COLLECTION } = await load()

      await runBackup({ now, triggeredByEmail: 'boss@saakie.in' })

      const manifest = dst.written[MANIFEST_COLLECTION]
      expect(manifest).toHaveLength(1)
      expect(manifest[0]).toMatchObject({ snapshot: SNAP, status: 'SUCCESS', totalDocuments: 1 })
    })

    it('skips system and previous-snapshot collections', async () => {
      const { dst } = wire({
        products: [{ _id: 1 }],
        'system.views': [{ _id: 9 }],
        '20260101T000000Z__products': [{ _id: 8 }],
        backup_20260102T000000Z: [{ _id: 6 }],
        _backup_runs: [{ _id: 7 }],
      })
      const { runBackup } = await load()

      const result = await runBackup({ now })

      expect(result.collections.map((c) => c.collection)).toEqual(['products'])
    })

    it('records the run against the admin history', async () => {
      wire({ products: [{ _id: 1 }] })
      const { runBackup } = await load()

      await runBackup({ now, triggeredById: 'user_1', triggeredByEmail: 'boss@saakie.in' })

      expect(mockPrisma.backupRun.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            snapshot: SNAP,
            status: 'RUNNING',
            triggeredById: 'user_1',
            triggeredByEmail: 'boss@saakie.in',
          }),
        })
      )
      expect(mockPrisma.backupRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'run_1' },
          data: expect.objectContaining({ status: 'SUCCESS', targetDatabase: 'saakie_backup' }),
        })
      )
    })

    it('keeps going when one collection fails, and reports PARTIAL', async () => {
      const src = makeDb({ products: [{ _id: 1 }], orders: [{ _id: 2 }] }, 'saakie')
      const dst = makeDb({}, 'saakie_backup')
      const realCollection = dst.db.collection.bind(dst.db)
      dst.db.collection = (name: string) => {
        const real = realCollection(name)
        return {
          ...real,
          // Writing the orders records fails part-way.
          insertMany: async (docs: unknown[]) => {
            if ((docs as Array<{ collection: string }>).some((d) => d.collection === 'orders')) {
              throw new Error('disk full')
            }
            return real.insertMany(docs)
          },
        }
      }
      clients.push({ uri: LIVE, db: src.db }, { uri: BACKUP, db: dst.db })
      const { runBackup } = await load()

      const result = await runBackup({ now })

      expect(result.status).toBe('PARTIAL')
      expect(result.ok).toBe(true)
      expect(result.collections.find((c) => c.collection === 'products')?.documents).toBe(1)
      expect(result.collections.find((c) => c.collection === 'orders')?.error).toContain('disk full')
      // No half-copied orders left in the snapshot.
      expect(dst.written[`backup_${SNAP}`]).toEqual([{ collection: 'products', data: { _id: 1 } }])
    })

    it('refuses to write into a destination that already holds shop collections', async () => {
      // As if the two connection strings were swapped: the "backup" side is a
      // live shop database.
      const src = makeDb({ products: [{ _id: 1 }] }, 'saakie_backup')
      const dst = makeDb({ products: [{ _id: 9 }], users: [{ _id: 8 }] }, 'saakie')
      clients.push({ uri: LIVE, db: src.db }, { uri: BACKUP, db: dst.db })
      const { runBackup } = await load()

      const result = await runBackup({ now })

      expect(result.status).toBe('FAILED')
      expect(result.error).toContain('looks like a live database')
      expect(result.error).toContain('Nothing was written')
      expect(dst.written).toEqual({})
      expect(dst.dropped).toEqual([])
      expect(mockPrisma.backupRun.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) })
      )
    })

    it('accepts a backup database that holds only earlier snapshots and its manifest', async () => {
      const src = makeDb({ products: [{ _id: 1 }] }, 'saakie')
      const dst = makeDb(
        {
          '20261001T203000Z__products': [{ _id: 1 }],
          backup_20261002T203000Z: [{ collection: 'products', data: { _id: 1 } }],
          _backup_runs: [{ _id: 'm' }],
        },
        'saakie_backup'
      )
      clients.push({ uri: LIVE, db: src.db }, { uri: BACKUP, db: dst.db })
      const { runBackup } = await load()

      expect((await runBackup({ now })).status).toBe('SUCCESS')
    })

    it('refuses to run against the live database', async () => {
      process.env.BACKUP_DATABASE_URL = LIVE
      const { runBackup } = await load()

      await expect(runBackup({ now })).rejects.toThrowError(/live database/i)
      expect(mockPrisma.backupRun.create).not.toHaveBeenCalled()
    })

    it('marks the run FAILED and redacts credentials when connecting blows up', async () => {
      // No client registered for the backup URI, so db() is undefined downstream.
      clients.push({ uri: LIVE, db: makeDb({ products: [] }, 'saakie').db })
      const { runBackup } = await load()

      const result = await runBackup({ now })

      expect(result.status).toBe('FAILED')
      expect(result.ok).toBe(false)
      expect(result.error).not.toContain('backup.mongodb.net')
      expect(mockPrisma.backupRun.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) })
      )
    })
  })

  describe('streamSnapshotExport', () => {
    const now = new Date('2026-09-27T12:00:00.000Z')
    const SNAP = '20260927T101500Z'

    async function collect(gen: AsyncGenerator<string>): Promise<string> {
      let out = ''
      for await (const chunk of gen) out += chunk
      return out
    }

    it('exports a one-collection snapshot grouped by shop collection', async () => {
      const dst = makeDb(
        {
          [`backup_${SNAP}`]: [
            { collection: 'products', data: { _id: 1, name: 'Silk' } },
            { collection: 'orders', data: { _id: 3 } },
            { collection: 'products', data: { _id: 2, name: 'Cotton' } },
          ],
        },
        'saakie_backup'
      )
      clients.push({ uri: BACKUP, db: dst.db })
      const { streamSnapshotExport, EXPORT_FORMAT } = await load()

      const parsed = JSON.parse(await collect(streamSnapshotExport(SNAP, now)))

      expect(parsed.format).toBe(EXPORT_FORMAT)
      expect(Object.keys(parsed.collections)).toEqual(['orders', 'products'])
      expect(parsed.collections.products.map((d: { _id: { $numberInt: string } }) => d._id)).toEqual([
        { $numberInt: '1' },
        { $numberInt: '2' },
      ])
    })

    it('round-trips ObjectIds and Dates from a one-collection snapshot', async () => {
      const { ObjectId, BSON } = await import('mongodb')
      const id = new ObjectId()
      const placed = new Date('2026-10-01T09:30:00Z')
      const dst = makeDb({ [`backup_${SNAP}`]: [{ collection: 'orders', data: { _id: id, placedAt: placed } }] }, 'saakie_backup')
      clients.push({ uri: BACKUP, db: dst.db })
      const { streamSnapshotExport } = await load()

      const parsed = BSON.EJSON.parse(await collect(streamSnapshotExport(SNAP, now)), { relaxed: false })

      expect(parsed.collections.orders[0]._id).toBeInstanceOf(ObjectId)
      expect(parsed.collections.orders[0]._id.equals(id)).toBe(true)
      expect(parsed.collections.orders[0].placedAt).toEqual(placed)
    })

    it('emits a single parseable JSON document', async () => {
      const dst = makeDb(
        { [`${SNAP}__products`]: [{ _id: 1, name: 'Silk' }], [`${SNAP}__orders`]: [] },
        'saakie_backup'
      )
      clients.push({ uri: BACKUP, db: dst.db })
      const { streamSnapshotExport, EXPORT_FORMAT } = await load()

      const parsed = JSON.parse(await collect(streamSnapshotExport(SNAP, now)))

      expect(parsed.format).toBe(EXPORT_FORMAT)
      expect(parsed.snapshot).toBe(SNAP)
      expect(parsed.exportedAt).toBe(now.toISOString())
      expect(Object.keys(parsed.collections).sort()).toEqual(['orders', 'products'])
      expect(parsed.collections.orders).toEqual([])
    })

    it('strips the snapshot prefix off the collection names', async () => {
      const dst = makeDb({ [`${SNAP}__store_settings`]: [{ _id: 1 }] }, 'saakie_backup')
      clients.push({ uri: BACKUP, db: dst.db })
      const { streamSnapshotExport } = await load()

      const parsed = JSON.parse(await collect(streamSnapshotExport(SNAP, now)))

      expect(Object.keys(parsed.collections)).toEqual(['store_settings'])
    })

    it('ignores collections belonging to other snapshots', async () => {
      const dst = makeDb(
        { [`${SNAP}__products`]: [{ _id: 1 }], '20260101T000000Z__products': [{ _id: 2 }] },
        'saakie_backup'
      )
      clients.push({ uri: BACKUP, db: dst.db })
      const { streamSnapshotExport } = await load()

      const parsed = JSON.parse(await collect(streamSnapshotExport(SNAP, now)))

      expect(parsed.collections.products).toHaveLength(1)
    })

    it('round-trips ObjectIds and Dates instead of flattening them to strings', async () => {
      const { BSON, ObjectId } = await import('mongodb')
      const id = new ObjectId('507f1f77bcf86cd799439011')
      const placed = new Date('2026-09-01T00:00:00.000Z')
      const dst = makeDb({ [`${SNAP}__orders`]: [{ _id: id, placedAt: placed }] }, 'saakie_backup')
      clients.push({ uri: BACKUP, db: dst.db })
      const { streamSnapshotExport } = await load()

      const text = await collect(streamSnapshotExport(SNAP, now))
      const revived = BSON.EJSON.parse(text, { relaxed: false }) as {
        collections: { orders: { _id: unknown; placedAt: unknown }[] }
      }
      const order = revived.collections.orders[0]

      expect(order._id).toBeInstanceOf(ObjectId)
      expect(String(order._id)).toBe('507f1f77bcf86cd799439011')
      expect(order.placedAt).toBeInstanceOf(Date)
      expect((order.placedAt as Date).toISOString()).toBe(placed.toISOString())
    })

    it('refuses a snapshot that does not exist', async () => {
      clients.push({ uri: BACKUP, db: makeDb({}, 'saakie_backup').db })
      const { streamSnapshotExport } = await load()

      await expect(collect(streamSnapshotExport(SNAP, now))).rejects.toThrowError(/not found/i)
    })

    it('names the file after the snapshot', async () => {
      const { exportFilename } = await load()

      expect(exportFilename(SNAP)).toBe(`saakie-backup-${SNAP}.json`)
    })
  })

  describe('isBackupRunning', () => {
    it('is false when nothing is running', async () => {
      const { isBackupRunning } = await load()

      expect(await isBackupRunning(new Date())).toBe(false)
    })

    it('is true while a recent run is still going', async () => {
      mockPrisma.backupRun.findFirst.mockResolvedValue({ id: 'run_1' })
      const { isBackupRunning } = await load()

      expect(await isBackupRunning(new Date())).toBe(true)
    })

    it('ignores a run old enough to be dead rather than in progress', async () => {
      const now = new Date('2026-09-27T12:00:00Z')
      const { isBackupRunning } = await load()
      await isBackupRunning(now)

      const where = mockPrisma.backupRun.findFirst.mock.calls[0][0].where
      expect(where.status).toBe('RUNNING')
      expect(where.startedAt.gt.getTime()).toBe(now.getTime() - 15 * 60 * 1000)
    })
  })

  describe('pruneSnapshots', () => {
    it('drops the oldest snapshots beyond the retention limit', async () => {
      const stamps = ['20260101T000000Z', '20260102T000000Z', '20260103T000000Z',
                      '20260104T000000Z', '20260105T000000Z', '20260106T000000Z']
      const collections: Record<string, unknown[]> = {}
      for (const s of stamps) collections[`${s}__products`] = []
      const dst = makeDb(collections, 'saakie_backup')
      const { pruneSnapshots } = await load()

      const dropped = await pruneSnapshots(
        { db: () => dst.db } as never,
        '20260106T000000Z'
      )

      expect(dropped).toEqual(['20260101T000000Z'])
      expect(dst.dropped).toContain('20260101T000000Z__products')
    })

    it('never drops the snapshot just written', async () => {
      const collections: Record<string, unknown[]> = {}
      for (let i = 1; i <= 8; i++) collections[`2026010${i}T000000Z__products`] = []
      const dst = makeDb(collections, 'saakie_backup')
      const { pruneSnapshots } = await load()

      const dropped = await pruneSnapshots({ db: () => dst.db } as never, '20260101T000000Z')

      expect(dropped).not.toContain('20260101T000000Z')
    })

    it('drops a whole snapshot in either layout: one collection now, several in the first', async () => {
      // Six very old snapshots: the oldest goes, the newest five stay.
      const collections: Record<string, unknown[]> = {
        '20260101T000000Z__products': [],
        '20260101T000000Z__orders': [],
        backup_20260102T000000Z: [],
        backup_20260103T000000Z: [],
        backup_20260104T000000Z: [],
        backup_20260105T000000Z: [],
        backup_20260106T000000Z: [],
      }
      const dst = makeDb(collections, 'saakie_backup')
      const { pruneSnapshots } = await load()

      expect(await pruneSnapshots({ db: () => dst.db } as never, '20260106T000000Z')).toEqual(['20260101T000000Z'])
      expect(dst.dropped.sort()).toEqual(['20260101T000000Z__orders', '20260101T000000Z__products'])

      dst.dropped.length = 0
      collections['backup_20260107T000000Z'] = []
      delete collections['20260101T000000Z__products']
      delete collections['20260101T000000Z__orders']
      expect(await pruneSnapshots({ db: () => dst.db } as never, '20260107T000000Z')).toEqual(['20260102T000000Z'])
      expect(dst.dropped).toEqual(['backup_20260102T000000Z'])
    })

    it('keeps everything when under the limit', async () => {
      const dst = makeDb({ '20260101T000000Z__products': [] }, 'saakie_backup')
      const { pruneSnapshots } = await load()

      expect(await pruneSnapshots({ db: () => dst.db } as never, '20260101T000000Z')).toEqual([])
    })
  })
})
