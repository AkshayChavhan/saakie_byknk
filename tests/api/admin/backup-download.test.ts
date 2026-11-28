import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockUser, createMockSession } from '../../mocks/factories'

const mockAuth = vi.fn()
vi.mock('@/auth', () => ({ auth: () => mockAuth() }))

const mockPrisma = { user: { findUnique: vi.fn() } }
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma, default: mockPrisma }))

const mockStream = vi.fn()
vi.mock('@/lib/server/backup', async () => {
  const actual = await vi.importActual<typeof import('@/lib/server/backup')>('@/lib/server/backup')
  return { ...actual, streamSnapshotExport: (...a: unknown[]) => mockStream(...a) }
})

async function* oneChunk() {
  yield '{}'
}

const download = async (snapshot: string) => {
  const { GET } = await import('@/app/api/admin/backup/[snapshot]/download/route')
  return GET(new Request('http://localhost:3000/x'), { params: Promise.resolve({ snapshot }) })
}

describe('GET /api/admin/backup/[snapshot]/download id check', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(createMockSession({ id: 'user_1', role: 'SUPER_ADMIN' }))
    mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ id: 'user_1', role: 'SUPER_ADMIN' }))
    mockStream.mockImplementation(() => oneChunk())
  })

  it('accepts an India-time snapshot id and a UTC one from before the change', async () => {
    expect((await download('20261024T045114IST')).status).toBe(200)
    expect((await download('20261023T232114Z')).status).toBe(200)
  })

  it.each(['20261024T045114', '../../etc/passwd', '20261024T045114IST__orders', 'backup_20261024T045114IST', ''])(
    'rejects %j before touching the backup database',
    async (id) => {
      const response = await download(id)

      expect(response.status).toBe(400)
      expect(mockStream).not.toHaveBeenCalled()
    }
  )
})
