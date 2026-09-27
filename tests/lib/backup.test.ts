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
  const db = {
    databaseName,
    listCollections: () => ({
      toArray: async () => Object.keys(collections).map((name) => ({ name })),
    }),
    collection: (name: string) => ({
      find: () => ({
        [Symbol.asyncIterator]: async function* () {
          for (const doc of collections[name] ?? []) yield doc
        },
        toArray: async () => collections[name] ?? [],
      }),
      insertMany: async (docs: unknown[]) => {
        written[name] = [...(written[name] ?? []), ...docs]
        return { insertedCount: docs.length }
      },
      insertOne: async (doc: unknown) => {
        written[name] = [...(written[name] ?? []), doc]
        return { insertedId: 'x' }
      },
      deleteMany: async () => ({ deletedCount: 0 }),
      drop: async () => {
        dropped.push(name)
      },
    }),
  }
  return { db, written, dropped }
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

  describe('runBackup', () => {
    const now = new Date('2026-09-27T10:15:00.000Z')
    const SNAP = '20260927T101500Z'

    function wire(source: Record<string, unknown[]>) {
      const src = makeDb(source, 'saakie')
      const dst = makeDb({}, 'saakie_backup')
      clients.push({ uri: LIVE, db: src.db }, { uri: BACKUP, db: dst.db })
      return { src, dst }
    }

    it('copies every document into snapshot-named collections', async () => {
      const { dst } = wire({
        products: [{ _id: 1 }, { _id: 2 }],
        orders: [{ _id: 3 }],
      })
      const { runBackup } = await load()

      const result = await runBackup({ now })

      expect(result.status).toBe('SUCCESS')
      expect(result.totalDocuments).toBe(3)
      expect(result.totalCollections).toBe(2)
      expect(dst.written[`${SNAP}__products`]).toHaveLength(2)
      expect(dst.written[`${SNAP}__orders`]).toHaveLength(1)
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
        if (name.endsWith('__orders')) {
          return { ...realCollection(name), insertMany: async () => { throw new Error('disk full') } }
        }
        return realCollection(name)
      }
      clients.push({ uri: LIVE, db: src.db }, { uri: BACKUP, db: dst.db })
      const { runBackup } = await load()

      const result = await runBackup({ now })

      expect(result.status).toBe('PARTIAL')
      expect(result.ok).toBe(true)
      expect(result.collections.find((c) => c.collection === 'products')?.documents).toBe(1)
      expect(result.collections.find((c) => c.collection === 'orders')?.error).toContain('disk full')
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

    it('keeps everything when under the limit', async () => {
      const dst = makeDb({ '20260101T000000Z__products': [] }, 'saakie_backup')
      const { pruneSnapshots } = await load()

      expect(await pruneSnapshots({ db: () => dst.db } as never, '20260101T000000Z')).toEqual([])
    })
  })
})
