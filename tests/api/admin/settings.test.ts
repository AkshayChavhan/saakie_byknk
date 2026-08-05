import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createMockUser, createMockSession } from '../../mocks/factories'

// Auth.js — `auth()` resolves the session (or null when signed out).
// requireAuth() reads session.user.id then loads the user via Prisma, so
// signInAs has to set the role in both places.
const mockAuth = vi.fn()
vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

// The settings routes go through lib/server/settings.ts, which reads/writes the
// single `store_settings` row via the default Prisma export.
const mockPrisma = {
  storeSetting: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  user: { findUnique: vi.fn() },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}))

function signInAs(role: string, id = 'user_123') {
  mockAuth.mockResolvedValue(createMockSession({ id, role }))
  mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ id, role }))
}

const patchRequest = (body?: unknown) =>
  new NextRequest('http://localhost:3000/api/admin/settings', {
    method: 'PATCH',
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })

const getSettings = async () => {
  const { GET } = await import('@/app/api/admin/settings/route')
  return GET()
}

const patchSettings = async (body?: unknown) => {
  const { PATCH } = await import('@/app/api/admin/settings/route')
  return PATCH(patchRequest(body))
}

describe('Admin Store Settings API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signInAs('ADMIN')
    // Default: the singleton row has never been written (fail-open).
    mockPrisma.storeSetting.findUnique.mockResolvedValue(null)
    // Echo back whatever the route asked to store.
    mockPrisma.storeSetting.upsert.mockImplementation(({ update }: any) =>
      Promise.resolve({ codEnabled: update.codEnabled })
    )
  })

  describe('authorization', () => {
    it('returns 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null)

      const response = await getSettings()

      expect(response.status).toBe(401)
      expect((await response.json()).error.message).toBe('Unauthorized - No session')
    })

    it('returns 403 for a signed-in shopper', async () => {
      signInAs('USER')

      const response = await getSettings()

      expect(response.status).toBe(403)
      expect((await response.json()).error.message).toBe('Forbidden - Admin access required')
    })

    it('allows ADMIN', async () => {
      signInAs('ADMIN')

      expect((await getSettings()).status).toBe(200)
    })

    it('allows SUPER_ADMIN', async () => {
      signInAs('SUPER_ADMIN')

      expect((await getSettings()).status).toBe(200)
    })

    it('rejects an unauthenticated PATCH before touching the switch', async () => {
      mockAuth.mockResolvedValue(null)

      const response = await patchSettings({ codEnabled: false })

      expect(response.status).toBe(401)
      expect((await response.json()).error.message).toBe('Unauthorized - No session')
      expect(mockPrisma.storeSetting.upsert).not.toHaveBeenCalled()
    })

    it('rejects a shopper flipping the kill switch', async () => {
      signInAs('USER')

      const response = await patchSettings({ codEnabled: false })

      expect(response.status).toBe(403)
      expect((await response.json()).error.message).toBe('Forbidden - Admin access required')
      expect(mockPrisma.storeSetting.upsert).not.toHaveBeenCalled()
    })

    it('lets SUPER_ADMIN write too', async () => {
      signInAs('SUPER_ADMIN')

      const response = await patchSettings({ codEnabled: false })

      expect(response.status).toBe(200)
      expect(mockPrisma.storeSetting.upsert).toHaveBeenCalled()
    })
  })

  describe('GET /api/admin/settings', () => {
    it('fails open to COD enabled when the row has never been written', async () => {
      mockPrisma.storeSetting.findUnique.mockResolvedValue(null)

      const response = await getSettings()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ codEnabled: true })
    })

    it('returns the stored value when the row exists', async () => {
      mockPrisma.storeSetting.findUnique.mockResolvedValue({ codEnabled: false })

      const data = await (await getSettings()).json()

      expect(data).toEqual({ codEnabled: false })
    })

    it('reads the singleton row by its fixed key', async () => {
      await getSettings()

      expect(mockPrisma.storeSetting.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { key: 'store' } })
      )
    })
  })

  describe('PATCH /api/admin/settings — malformed bodies', () => {
    // `JSON.parse('null')` succeeds and yields null, so a bare `.catch(() => ({}))`
    // guard still throws on property access and leaks a 500.
    it('rejects a literal JSON null body with 400, not a 500', async () => {
      const response = await patchSettings(null)
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error).toBe('Nothing to update')
      expect(mockPrisma.storeSetting.upsert).not.toHaveBeenCalled()
    })

    it('rejects an unparseable body with 400, not a 500', async () => {
      const { PATCH } = await import('@/app/api/admin/settings/route')
      const response = await PATCH(
        new NextRequest('http://localhost:3000/api/admin/settings', {
          method: 'PATCH',
          body: '{not json',
        })
      )
      expect(response.status).toBe(400)
      expect(mockPrisma.storeSetting.upsert).not.toHaveBeenCalled()
    })

    it('rejects a non-object JSON body with 400, not a 500', async () => {
      for (const body of [42, 'codEnabled', true]) {
        const response = await patchSettings(body)
        expect(response.status).toBe(400)
      }
      expect(mockPrisma.storeSetting.upsert).not.toHaveBeenCalled()
    })
  })

  describe('PATCH /api/admin/settings', () => {
    it('turns COD off and returns the new value', async () => {
      const response = await patchSettings({ codEnabled: false })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ codEnabled: false })

      const call = mockPrisma.storeSetting.upsert.mock.calls[0][0]
      expect(call.where).toEqual({ key: 'store' })
      expect(call.update.codEnabled).toBe(false)
      expect(call.create.codEnabled).toBe(false)
      // The upsert must create the singleton under the same fixed key.
      expect(call.create.key).toBe('store')
    })

    it('turns COD back on', async () => {
      mockPrisma.storeSetting.findUnique.mockResolvedValue({ codEnabled: false })

      const data = await (await patchSettings({ codEnabled: true })).json()

      expect(data).toEqual({ codEnabled: true })
      expect(mockPrisma.storeSetting.upsert.mock.calls[0][0].update.codEnabled).toBe(true)
    })

    it('records which admin flipped the switch', async () => {
      signInAs('ADMIN', 'admin_99')

      await patchSettings({ codEnabled: false })

      const call = mockPrisma.storeSetting.upsert.mock.calls[0][0]
      expect(call.update.updatedById).toBe('admin_99')
      expect(call.create.updatedById).toBe('admin_99')
    })

    // The security-relevant case: `"false"`, `0` and `null` are all values a
    // sloppy client (or an attacker) could send. A truthy string must never be
    // coerced into `true` and quietly re-open Cash on Delivery.
    it.each([
      ['the string "false"', 'false'],
      ['the string "true"', 'true'],
      ['the number 0', 0],
      ['the number 1', 1],
      ['null', null],
      ['a string "yes"', 'yes'],
    ])('rejects a non-boolean codEnabled: %s', async (_label, value) => {
      const response = await patchSettings({ codEnabled: value })
      const data = await response.json()

      expect(response.status).toBe(400)
      // Inline route validation uses the flat error shape.
      expect(data.error).toBe('Nothing to update')
      expect(mockPrisma.storeSetting.upsert).not.toHaveBeenCalled()
    })

    it('rejects an empty body', async () => {
      const response = await patchSettings({})
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Nothing to update')
      expect(mockPrisma.storeSetting.upsert).not.toHaveBeenCalled()
    })

    it('rejects a request with no JSON body at all', async () => {
      const response = await patchSettings()

      expect(response.status).toBe(400)
      expect((await response.json()).error).toBe('Nothing to update')
      expect(mockPrisma.storeSetting.upsert).not.toHaveBeenCalled()
    })

    it('ignores unknown keys rather than writing them', async () => {
      const response = await patchSettings({ prepaidEnabled: false, key: 'other' })

      expect(response.status).toBe(400)
      expect((await response.json()).error).toBe('Nothing to update')
      expect(mockPrisma.storeSetting.upsert).not.toHaveBeenCalled()
    })

    it('writes only codEnabled when unknown keys ride along', async () => {
      await patchSettings({ codEnabled: false, key: 'hijacked', updatedById: 'someone_else' })

      const call = mockPrisma.storeSetting.upsert.mock.calls[0][0]
      expect(Object.keys(call.update).sort()).toEqual(['codEnabled', 'updatedById'])
      expect(call.update.updatedById).toBe('user_123')
      expect(call.where).toEqual({ key: 'store' })
    })
  })
})
