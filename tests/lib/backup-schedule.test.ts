import { describe, it, expect, vi, beforeEach } from 'vitest'

const backup = vi.hoisted(() => ({ runBackup: vi.fn(), isBackupRunning: vi.fn() }))
vi.mock('@/lib/server/backup', async () => {
  // Keep the real error class and redaction; replace only the database work.
  const actual = await vi.importActual<typeof import('@/lib/server/backup')>('@/lib/server/backup')
  return { ...actual, runBackup: backup.runBackup, isBackupRunning: backup.isBackupRunning }
})
vi.mock('@/lib/prisma', () => ({ prisma: {}, default: {} }))

import { runScheduledBackup, SCHEDULED_TRIGGER } from '@/lib/server/backup-schedule'
import { BackupConfigError } from '@/lib/server/backup'

const result = (overrides: Record<string, unknown> = {}) => ({
  ok: true,
  snapshot: '20261021T203000Z',
  status: 'SUCCESS',
  targetDatabase: 'saakie_backup',
  collections: [
    { collection: 'products', documents: 72 },
    { collection: 'orders', documents: 4 },
  ],
  totalCollections: 2,
  totalDocuments: 76,
  durationMs: 2300,
  pruned: [],
  ...overrides,
})

const run = async () => {
  const lines: string[] = []
  const code = await runScheduledBackup((line) => lines.push(line), new Date('2026-10-21T20:30:00Z'))
  return { code, log: lines.join('\n') }
}

describe('runScheduledBackup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    backup.isBackupRunning.mockResolvedValue(false)
  })

  it('runs a backup labelled as the nightly job and exits 0 on success', async () => {
    backup.runBackup.mockResolvedValue(result({ pruned: ['20260801T203000Z'] }))

    const { code, log } = await run()

    expect(code).toBe(0)
    expect(backup.runBackup).toHaveBeenCalledWith(expect.objectContaining({ triggeredByEmail: SCHEDULED_TRIGGER }))
    expect(log).toContain('Snapshot 20261021T203000Z: SUCCESS')
    expect(log).toContain('Copied 76 documents from 2 collections in 2.3 s')
    expect(log).toContain('Removed 1 older snapshot(s)')
  })

  it('exits 1 on a partial copy, naming the collection that failed', async () => {
    backup.runBackup.mockResolvedValue(
      result({ status: 'PARTIAL', ok: true, collections: [{ collection: 'orders', documents: 0, error: 'timed out' }] })
    )

    const { code, log } = await run()

    expect(code).toBe(1)
    expect(log).toContain('orders: failed (timed out)')
  })

  it('exits 1 when the backup failed', async () => {
    backup.runBackup.mockResolvedValue(result({ status: 'FAILED', ok: false, collections: [], error: 'cannot connect' }))

    expect((await run()).code).toBe(1)
  })

  it('exits 1 with a plain message when the backup database is not configured', async () => {
    backup.runBackup.mockRejectedValue(new BackupConfigError('No backup database is configured.', 'NOT_CONFIGURED'))

    const { code, log } = await run()

    expect(code).toBe(1)
    expect(log).toContain('Backup did not run: No backup database is configured.')
  })

  it('skips quietly when another backup is still running', async () => {
    backup.isBackupRunning.mockResolvedValue(true)

    const { code, log } = await run()

    expect(code).toBe(0)
    expect(log).toContain('Skipped')
    expect(backup.runBackup).not.toHaveBeenCalled()
  })

  it('never writes a connection string into the public job log', async () => {
    backup.runBackup.mockRejectedValue(new Error('connect failed for mongodb+srv://admin:s3cret@cluster0.example.mongodb.net/saakie'))

    const { log } = await run()

    expect(log).not.toContain('s3cret')
    expect(log).not.toContain('admin:')
    expect(log).toContain('<redacted>')
  })
})
