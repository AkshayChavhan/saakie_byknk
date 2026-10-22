import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMockUser, createMockSession } from '../../mocks/factories'

const mockAuth = vi.fn()
vi.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

const mockPrisma = {
  user: { findUnique: vi.fn() },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}))

function signInAs(role: string) {
  mockAuth.mockResolvedValue(createMockSession({ id: 'user_123', role }))
  mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ role }))
}

const SHARE = 'https://cloud.umami.is/share/abc123'

describe('Admin Analytics shortcut', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('UMAMI_SHARE_URL', SHARE)
    signInAs('SUPER_ADMIN')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns 401 when not signed in', async () => {
    mockAuth.mockResolvedValue(null)
    const { GET } = await import('@/app/api/admin/analytics/route')

    expect((await GET()).status).toBe(401)
  })

  it('returns 403 for an ADMIN, who may not see traffic stats', async () => {
    signInAs('ADMIN')
    const { GET } = await import('@/app/api/admin/analytics/route')
    const res = await GET()

    expect(res.status).toBe(403)
    expect(res.headers.get('location')).toBeNull()
  })

  it('returns 403 for a customer and never reveals the link', async () => {
    signInAs('USER')
    const { GET } = await import('@/app/api/admin/analytics/route')
    const res = await GET()

    expect(res.status).toBe(403)
    expect(res.headers.get('location')).toBeNull()
  })

  it('redirects a SUPER_ADMIN to the share link', async () => {
    const { GET } = await import('@/app/api/admin/analytics/route')
    const res = await GET()

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe(SHARE)
    expect(res.headers.get('cache-control')).toBe('no-store')
  })

  it('answers 404 when the link is not configured', async () => {
    vi.stubEnv('UMAMI_SHARE_URL', '')
    const { GET } = await import('@/app/api/admin/analytics/route')

    expect((await GET()).status).toBe(404)
  })

  it('refuses a link that is not https', async () => {
    vi.stubEnv('UMAMI_SHARE_URL', 'http://cloud.umami.is/share/abc123')
    const { GET } = await import('@/app/api/admin/analytics/route')

    expect((await GET()).status).toBe(404)
  })
})
