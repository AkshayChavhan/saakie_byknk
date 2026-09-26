import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockUser, createMockSession } from '../../mocks/factories'

const mockAuth = vi.fn()
vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

const mockPrisma = {
  user: { findUnique: vi.fn() },
  storeSettings: { findUnique: vi.fn(), upsert: vi.fn() },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}))

function signInAs(role: string) {
  mockAuth.mockResolvedValue(createMockSession({ id: 'user_123', role }))
  mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ role }))
}

const patch = (body: unknown) =>
  new Request('http://localhost:3000/api/admin/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

const SAVED_AT = new Date('2026-09-26T08:00:00Z')

describe('Admin Store Settings API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signInAs('ADMIN')
    mockPrisma.storeSettings.findUnique.mockResolvedValue(null)
    mockPrisma.storeSettings.upsert.mockImplementation(({ update }: any) =>
      Promise.resolve({ shippingEnabled: update.shippingEnabled, updatedAt: SAVED_AT })
    )
  })

  describe('authorization', () => {
    it('returns 401 when not signed in', async () => {
      mockAuth.mockResolvedValue(null)
      const { GET } = await import('@/app/api/admin/settings/route')

      expect((await GET()).status).toBe(401)
    })

    it('returns 403 for a non-admin', async () => {
      signInAs('USER')
      const { GET } = await import('@/app/api/admin/settings/route')

      expect((await GET()).status).toBe(403)
    })

    it('refuses a non-admin PATCH, leaving the setting untouched', async () => {
      signInAs('USER')
      const { PATCH } = await import('@/app/api/admin/settings/route')

      expect((await PATCH(patch({ shippingEnabled: false }))).status).toBe(403)
      expect(mockPrisma.storeSettings.upsert).not.toHaveBeenCalled()
    })
  })

  describe('GET', () => {
    it('returns the defaults before anything has been saved', async () => {
      const { GET } = await import('@/app/api/admin/settings/route')

      expect(await (await GET()).json()).toEqual({ shippingEnabled: true, updatedAt: null })
    })

    it('returns the saved setting with its timestamp', async () => {
      mockPrisma.storeSettings.findUnique.mockResolvedValue({
        shippingEnabled: false,
        updatedAt: SAVED_AT,
      })
      const { GET } = await import('@/app/api/admin/settings/route')

      expect(await (await GET()).json()).toEqual({
        shippingEnabled: false,
        updatedAt: SAVED_AT.toISOString(),
      })
    })
  })

  describe('PATCH', () => {
    it('switches shipping off', async () => {
      const { PATCH } = await import('@/app/api/admin/settings/route')

      const response = await PATCH(patch({ shippingEnabled: false }))

      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({ shippingEnabled: false })
      expect(mockPrisma.storeSettings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { shippingEnabled: false } })
      )
    })

    it('switches shipping back on', async () => {
      const { PATCH } = await import('@/app/api/admin/settings/route')

      expect(await (await PATCH(patch({ shippingEnabled: true }))).json()).toMatchObject({
        shippingEnabled: true,
      })
    })

    it.each([
      ['a string', 'false'],
      ['a number', 0],
      ['null', null],
    ])('rejects %s instead of a boolean', async (_label, value) => {
      const { PATCH } = await import('@/app/api/admin/settings/route')

      const response = await PATCH(patch({ shippingEnabled: value }))

      expect(response.status).toBe(400)
      expect(mockPrisma.storeSettings.upsert).not.toHaveBeenCalled()
    })

    it('rejects a body with no known setting in it', async () => {
      const { PATCH } = await import('@/app/api/admin/settings/route')

      const response = await PATCH(patch({ somethingElse: true }))

      expect(response.status).toBe(400)
      expect(mockPrisma.storeSettings.upsert).not.toHaveBeenCalled()
    })

    it('rejects a malformed body', async () => {
      const { PATCH } = await import('@/app/api/admin/settings/route')
      const bad = new Request('http://localhost:3000/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      })

      expect((await PATCH(bad)).status).toBe(400)
    })
  })
})
