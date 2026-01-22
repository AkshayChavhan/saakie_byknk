import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockUser } from '../mocks/factories'

// Mock PrismaClient
const mockPrisma = {
  user: {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
  cartItem: { deleteMany: vi.fn() },
  cart: { deleteMany: vi.fn() },
  wishlistItem: { deleteMany: vi.fn() },
  wishlist: { deleteMany: vi.fn() },
  review: { deleteMany: vi.fn() },
  order: { deleteMany: vi.fn() },
  address: { deleteMany: vi.fn() },
  $transaction: vi.fn((callbacks) => Promise.all(callbacks)),
}

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
  UserRole: {
    USER: 'USER',
    ADMIN: 'ADMIN',
    SUPER_ADMIN: 'SUPER_ADMIN',
  },
}))

describe('user management utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createUser', () => {
    it('creates a new user successfully', async () => {
      const userData = {
        clerkId: 'clerk_123',
        email: 'test@example.com',
        name: 'Test User',
        phone: '+919876543210',
        imageUrl: 'https://example.com/avatar.jpg',
        profileImageUrl: 'https://example.com/profile.jpg',
        gender: 'female',
        role: 'USER' as const,
      }
      const createdUser = createMockUser(userData)
      mockPrisma.user.create.mockResolvedValue(createdUser)

      const { createUser } = await import('@/lib/users')
      const result = await createUser(userData)

      expect(mockPrisma.user.create).toHaveBeenCalledWith({ data: userData })
      expect(result).toEqual(createdUser)
    })

    it('throws error when creation fails', async () => {
      mockPrisma.user.create.mockRejectedValue(new Error('Database error'))

      const { createUser } = await import('@/lib/users')

      await expect(
        createUser({
          clerkId: 'clerk_123',
          email: 'test@example.com',
          name: null,
          phone: null,
          imageUrl: null,
          profileImageUrl: null,
          gender: null,
          role: 'USER' as const,
        })
      ).rejects.toThrow('Database error')
    })

    it('creates user with admin role', async () => {
      const userData = {
        clerkId: 'clerk_admin',
        email: 'admin@example.com',
        name: 'Admin User',
        phone: null,
        imageUrl: null,
        profileImageUrl: null,
        gender: null,
        role: 'ADMIN' as const,
      }
      mockPrisma.user.create.mockResolvedValue(createMockUser(userData))

      const { createUser } = await import('@/lib/users')
      await createUser(userData)

      expect(mockPrisma.user.create).toHaveBeenCalledWith({ data: userData })
    })
  })

  describe('updateUser', () => {
    it('updates user successfully', async () => {
      const updateData = {
        email: 'updated@example.com',
        name: 'Updated Name',
        phone: '+919876543211',
        imageUrl: 'https://example.com/new-avatar.jpg',
        profileImageUrl: 'https://example.com/new-profile.jpg',
        gender: 'male',
      }
      const updatedUser = createMockUser({ ...updateData })
      mockPrisma.user.update.mockResolvedValue(updatedUser)

      const { updateUser } = await import('@/lib/users')
      const result = await updateUser('clerk_123', updateData)

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { clerkId: 'clerk_123' },
        data: updateData,
      })
      expect(result).toEqual(updatedUser)
    })

    it('throws error when user not found', async () => {
      mockPrisma.user.update.mockRejectedValue(new Error('User not found'))

      const { updateUser } = await import('@/lib/users')

      await expect(
        updateUser('nonexistent', {
          email: 'test@example.com',
          name: null,
          phone: null,
          imageUrl: null,
          profileImageUrl: null,
          gender: null,
        })
      ).rejects.toThrow('User not found')
    })
  })

  describe('deleteUser', () => {
    it('deletes user and all related data', async () => {
      const mockUser = createMockUser()
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.$transaction.mockImplementation(async (callbacks) => {
        return Promise.all(callbacks)
      })

      const { deleteUser } = await import('@/lib/users')
      const result = await deleteUser('clerk_user_123')

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { clerkId: 'clerk_user_123' },
      })
      expect(mockPrisma.$transaction).toHaveBeenCalled()
      expect(result).toEqual({ success: true, clerkId: 'clerk_user_123' })
    })

    it('throws error when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const { deleteUser } = await import('@/lib/users')

      await expect(deleteUser('nonexistent')).rejects.toThrow('User not found')
    })

    it('throws error when transaction fails', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser())
      mockPrisma.$transaction.mockRejectedValue(new Error('Transaction failed'))

      const { deleteUser } = await import('@/lib/users')

      await expect(deleteUser('clerk_123')).rejects.toThrow('Transaction failed')
    })
  })
})
