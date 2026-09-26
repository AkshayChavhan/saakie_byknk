import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma = {
  storeSettings: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}))

const load = () => import('@/lib/server/settings')

const SAVED_AT = new Date('2026-09-26T08:00:00Z')

describe('lib/server/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getStoreSettings', () => {
    it('falls back to the defaults when nothing has been saved yet', async () => {
      mockPrisma.storeSettings.findUnique.mockResolvedValue(null)
      const { getStoreSettings } = await load()

      expect(await getStoreSettings()).toEqual({ shippingEnabled: true, updatedAt: null })
    })

    it('returns the saved row when an admin has switched shipping off', async () => {
      mockPrisma.storeSettings.findUnique.mockResolvedValue({
        shippingEnabled: false,
        updatedAt: SAVED_AT,
      })
      const { getStoreSettings } = await load()

      expect(await getStoreSettings()).toEqual({
        shippingEnabled: false,
        updatedAt: SAVED_AT.toISOString(),
      })
    })

    it('reads the single keyed document', async () => {
      mockPrisma.storeSettings.findUnique.mockResolvedValue(null)
      const { getStoreSettings, SETTINGS_KEY } = await load()
      await getStoreSettings()

      expect(mockPrisma.storeSettings.findUnique).toHaveBeenCalledWith({
        where: { key: SETTINGS_KEY },
      })
    })
  })

  describe('updateStoreSettings', () => {
    it('creates the document on the first save', async () => {
      mockPrisma.storeSettings.upsert.mockResolvedValue({
        shippingEnabled: false,
        updatedAt: SAVED_AT,
      })
      const { updateStoreSettings, SETTINGS_KEY } = await load()

      const result = await updateStoreSettings({ shippingEnabled: false })

      expect(mockPrisma.storeSettings.upsert).toHaveBeenCalledWith({
        where: { key: SETTINGS_KEY },
        create: { key: SETTINGS_KEY, shippingEnabled: false },
        update: { shippingEnabled: false },
      })
      expect(result.shippingEnabled).toBe(false)
    })

    it('switches shipping back on', async () => {
      mockPrisma.storeSettings.upsert.mockResolvedValue({
        shippingEnabled: true,
        updatedAt: SAVED_AT,
      })
      const { updateStoreSettings } = await load()

      expect(await updateStoreSettings({ shippingEnabled: true })).toEqual({
        shippingEnabled: true,
        updatedAt: SAVED_AT.toISOString(),
      })
    })
  })
})
