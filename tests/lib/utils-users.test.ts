import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMockUser } from '../mocks/factories'

// Mock PrismaClient
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
  },
  $disconnect: vi.fn(),
}

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}))

describe('lib/utils/users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  describe('getPublicMetadata', () => {
    it('returns user metadata when user exists', async () => {
      const mockUser = createMockUser({
        role: 'ADMIN',
        email: 'admin@example.com',
        name: 'Admin User',
      })
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)

      const { getPublicMetadata } = await import('@/lib/utils/users')
      const result = await getPublicMetadata('clerk_user_123')

      expect(result).toEqual({
        role: 'ADMIN',
        email: 'admin@example.com',
        name: 'Admin User',
      })
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { clerkId: 'clerk_user_123' },
        select: {
          role: true,
          email: true,
          name: true,
        },
      })
    })

    it('returns null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const { getPublicMetadata } = await import('@/lib/utils/users')
      const result = await getPublicMetadata('nonexistent')

      expect(result).toBeNull()
    })

    it('returns null when userId is empty', async () => {
      const { getPublicMetadata } = await import('@/lib/utils/users')
      const result = await getPublicMetadata('')

      expect(result).toBeNull()
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
    })

    it('handles database errors gracefully', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('DB Error'))

      const { getPublicMetadata } = await import('@/lib/utils/users')
      const result = await getPublicMetadata('clerk_123')

      expect(result).toBeNull()
    })

    it('disconnects from database after query', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser())

      const { getPublicMetadata } = await import('@/lib/utils/users')
      await getPublicMetadata('clerk_123')

      expect(mockPrisma.$disconnect).toHaveBeenCalled()
    })

    it('disconnects even when error occurs', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('DB Error'))

      const { getPublicMetadata } = await import('@/lib/utils/users')
      await getPublicMetadata('clerk_123')

      expect(mockPrisma.$disconnect).toHaveBeenCalled()
    })

    it('returns correct role for SUPER_ADMIN', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(
        createMockUser({ role: 'SUPER_ADMIN' })
      )

      const { getPublicMetadata } = await import('@/lib/utils/users')
      const result = await getPublicMetadata('clerk_123')

      expect(result?.role).toBe('SUPER_ADMIN')
    })

    it('returns correct role for regular USER', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(
        createMockUser({ role: 'USER' })
      )

      const { getPublicMetadata } = await import('@/lib/utils/users')
      const result = await getPublicMetadata('clerk_123')

      expect(result?.role).toBe('USER')
    })
  })
})
