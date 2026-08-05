import { describe, it, expect, vi, beforeEach } from 'vitest'

// Public route: no session involved, it only reads the singleton settings row
// through the default Prisma export.
const mockPrisma = {
  storeSetting: {
    findUnique: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}))

const get = async () => {
  const { GET } = await import('@/app/api/store-settings/route')
  return GET()
}

describe('Public Store Settings API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: the singleton row has never been written.
    mockPrisma.storeSetting.findUnique.mockResolvedValue(null)
  })

  describe('GET /api/store-settings', () => {
    it('fails open to COD enabled when no settings row exists', async () => {
      const response = await get()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ codEnabled: true })
    })

    it('returns the stored value once an admin has flipped the switch', async () => {
      mockPrisma.storeSetting.findUnique.mockResolvedValue({ codEnabled: false })

      const response = await get()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ codEnabled: false })
    })

    it('reads the singleton row by its fixed key', async () => {
      await get()

      expect(mockPrisma.storeSetting.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { key: 'store' } })
      )
    })

    it('exposes only codEnabled, never the rest of the row', async () => {
      // Whatever the row carries — audit columns today, admin-only switches
      // tomorrow — the storefront payload must stay a single key.
      mockPrisma.storeSetting.findUnique.mockResolvedValue({
        key: 'store',
        codEnabled: false,
        updatedById: 'admin_99',
        updatedAt: new Date('2024-01-01'),
      })

      const data = await (await get()).json()

      expect(Object.keys(data)).toEqual(['codEnabled'])
    })

    it('handles database errors with a 500', async () => {
      mockPrisma.storeSetting.findUnique.mockRejectedValue(new Error('Database error'))

      const response = await get()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })
})
