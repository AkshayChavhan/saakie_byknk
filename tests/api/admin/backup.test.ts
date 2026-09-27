import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockUser, createMockSession } from '../../mocks/factories'

const mockAuth = vi.fn()
vi.mock('@/auth', () => ({ auth: () => mockAuth() }))

const mockPrisma = {
  user: { findUnique: vi.fn() },
  backupRun: { findMany: vi.fn(), findFirst: vi.fn() },
}
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma, default: mockPrisma }))

const mockRunBackup = vi.fn()
const mockIsRunning = vi.fn()
const mockReadConfig = vi.fn()

vi.mock('@/lib/server/backup', async () => {
  const actual = await vi.importActual<typeof import('@/lib/server/backup')>('@/lib/server/backup')
  return {
    ...actual,
    runBackup: (...a: unknown[]) => mockRunBackup(...a),
    isBackupRunning: (...a: unknown[]) => mockIsRunning(...a),
    readBackupConfig: () => mockReadConfig(),
  }
})

function signInAs(role: string) {
  mockAuth.mockResolvedValue(createMockSession({ id: 'user_1', role }))
  mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ id: 'user_1', role }))
}

const SUCCESS = {
  ok: true,
  snapshot: '20260927T101500Z',
  status: 'SUCCESS',
  targetDatabase: 'saakie_backup',
  collections: [{ collection: 'products', documents: 2 }],
  totalCollections: 1,
  totalDocuments: 2,
  durationMs: 1200,
}

describe('Admin Backup API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signInAs('SUPER_ADMIN')
    mockPrisma.backupRun.findMany.mockResolvedValue([])
    mockIsRunning.mockResolvedValue(false)
    mockReadConfig.mockReturnValue({ sourceUri: 'a', targetUri: 'b' })
    mockRunBackup.mockResolvedValue(SUCCESS)
  })

  describe('authorization', () => {
    it('returns 401 when signed out', async () => {
      mockAuth.mockResolvedValue(null)
      const { GET } = await import('@/app/api/admin/backup/route')

      expect((await GET()).status).toBe(401)
    })

    it('returns 403 for a plain user', async () => {
      signInAs('USER')
      const { GET } = await import('@/app/api/admin/backup/route')

      expect((await GET()).status).toBe(403)
    })

    it('returns 403 for a mere ADMIN — backups copy every customer record', async () => {
      signInAs('ADMIN')
      const { GET, POST } = await import('@/app/api/admin/backup/route')

      expect((await GET()).status).toBe(403)
      expect((await POST()).status).toBe(403)
      expect(mockRunBackup).not.toHaveBeenCalled()
    })

    it('lets a SUPER_ADMIN through', async () => {
      const { GET } = await import('@/app/api/admin/backup/route')

      expect((await GET()).status).toBe(200)
    })
  })

  describe('GET', () => {
    it('reports that backups are configured', async () => {
      const { GET } = await import('@/app/api/admin/backup/route')

      const body = await (await GET()).json()
      expect(body).toMatchObject({ configured: true, configError: null, running: false })
    })

    it('explains itself when no backup database is set, instead of erroring', async () => {
      const { BackupConfigError } = await import('@/lib/server/backup')
      mockReadConfig.mockImplementation(() => {
        throw new BackupConfigError('No backup database is configured.', 'NOT_CONFIGURED')
      })
      const { GET } = await import('@/app/api/admin/backup/route')

      const response = await GET()
      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({
        configured: false,
        configError: 'No backup database is configured.',
      })
    })

    it('returns the most recent runs, newest first', async () => {
      const { GET } = await import('@/app/api/admin/backup/route')
      await GET()

      expect(mockPrisma.backupRun.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { startedAt: 'desc' }, take: 20 })
      )
    })
  })

  describe('POST', () => {
    it('runs a backup and reports what was copied', async () => {
      const { POST } = await import('@/app/api/admin/backup/route')

      const response = await POST()

      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({ status: 'SUCCESS', totalDocuments: 2 })
    })

    it('attributes the run to whoever pressed the button', async () => {
      const { POST } = await import('@/app/api/admin/backup/route')
      await POST()

      expect(mockRunBackup).toHaveBeenCalledWith(
        expect.objectContaining({ triggeredById: 'user_1' })
      )
    })

    it('refuses to start a second run while one is going', async () => {
      mockIsRunning.mockResolvedValue(true)
      const { POST } = await import('@/app/api/admin/backup/route')

      const response = await POST()

      expect(response.status).toBe(409)
      expect(mockRunBackup).not.toHaveBeenCalled()
    })

    it('answers 400 with the reason when the destination is misconfigured', async () => {
      const { BackupConfigError } = await import('@/lib/server/backup')
      mockRunBackup.mockRejectedValue(
        new BackupConfigError('BACKUP_DATABASE_URL points at the live database.', 'SAME_DATABASE')
      )
      const { POST } = await import('@/app/api/admin/backup/route')

      const response = await POST()

      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({ code: 'SAME_DATABASE' })
    })

    it('answers 500 when the copy itself failed', async () => {
      mockRunBackup.mockResolvedValue({ ...SUCCESS, ok: false, status: 'FAILED', error: 'nope' })
      const { POST } = await import('@/app/api/admin/backup/route')

      expect((await POST()).status).toBe(500)
    })
  })
})
