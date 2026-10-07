import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Prisma } from '@prisma/client'

const mockPrisma = {
  user: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  cart: { create: vi.fn() },
  wishlist: { create: vi.fn() },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}))

const mockDeleteUser = vi.fn()
vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: async () => ({ users: { deleteUser: mockDeleteUser } }),
}))

const load = () => import('@/lib/server/clerk-users')

const identity = (overrides = {}) => ({
  clerkId: 'user_clerk_1',
  email: 'priya@example.com',
  emailVerified: true,
  name: 'Priya Sharma',
  imageUrl: null,
  ...overrides,
})

// findFirst is called twice on the way to a link: by clerkId, then by email.
const notLinkedThenEmail = (byEmail: unknown) => {
  mockPrisma.user.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(byEmail)
}

describe('lib/server/clerk-users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.user.findFirst.mockReset()
  })

  describe('identityFromUser', () => {
    it('reads the PRIMARY email, lower-cased, with its verification state', async () => {
      const { identityFromUser } = await load()
      const result = identityFromUser({
        id: 'user_clerk_1',
        primaryEmailAddressId: 'idn_2',
        emailAddresses: [
          { id: 'idn_1', emailAddress: 'old@example.com', verification: { status: 'verified' } },
          { id: 'idn_2', emailAddress: 'Priya@Example.com', verification: { status: 'unverified' } },
        ],
        firstName: 'Priya',
        lastName: 'Sharma',
        hasImage: false,
        imageUrl: 'https://img.clerk.com/default-avatar',
      } as never)

      expect(result).toEqual({
        clerkId: 'user_clerk_1',
        email: 'priya@example.com',
        emailVerified: false,
        name: 'Priya Sharma',
        // Clerk's generated placeholder is not a photo the customer chose.
        imageUrl: null,
      })
    })
  })

  describe('identityFromJSON', () => {
    it('normalises a webhook payload to the same shape', async () => {
      const { identityFromJSON } = await load()
      const result = identityFromJSON({
        id: 'user_clerk_1',
        primary_email_address_id: 'idn_1',
        email_addresses: [
          { id: 'idn_1', email_address: 'Priya@Example.com', verification: { status: 'verified' } },
        ],
        first_name: null,
        last_name: null,
        has_image: true,
        image_url: 'https://img.clerk.com/photo',
      } as never)

      expect(result).toEqual({
        clerkId: 'user_clerk_1',
        email: 'priya@example.com',
        emailVerified: true,
        name: null,
        imageUrl: 'https://img.clerk.com/photo',
      })
    })
  })

  describe('linkClerkUser', () => {
    it('returns the already-linked user without touching anything', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce({ id: 'store_1' })
      const { linkClerkUser } = await load()

      expect(await linkClerkUser(identity())).toBe('store_1')
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
      expect(mockPrisma.user.create).not.toHaveBeenCalled()
    })

    // Linking by email hands over an existing account — an admin's included.
    it('refuses to link or create on an UNVERIFIED email', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(null)
      const { linkClerkUser } = await load()

      expect(await linkClerkUser(identity({ emailVerified: false }))).toBeNull()
      expect(mockPrisma.user.findFirst).toHaveBeenCalledTimes(1)
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
      expect(mockPrisma.user.create).not.toHaveBeenCalled()
    })

    it('refuses a Clerk user with no email at all', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(null)
      const { linkClerkUser } = await load()

      expect(await linkClerkUser(identity({ email: null }))).toBeNull()
      expect(mockPrisma.user.create).not.toHaveBeenCalled()
    })

    it('links a pre-Clerk account by email, keeping its id, name and photo', async () => {
      notLinkedThenEmail({
        id: 'store_1',
        clerkId: null,
        emailVerified: new Date('2026-01-01'),
        name: 'Priya S.',
        imageUrl: 'https://res.cloudinary.com/x/p.jpg',
      })
      const { linkClerkUser } = await load()

      expect(await linkClerkUser(identity())).toBe('store_1')
      expect(mockPrisma.user.findFirst).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: { email: { equals: 'priya@example.com', mode: 'insensitive' } },
        })
      )
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'store_1' },
        data: {
          clerkId: 'user_clerk_1',
          emailVerified: new Date('2026-01-01'),
          name: 'Priya S.',
          imageUrl: 'https://res.cloudinary.com/x/p.jpg',
        },
      })
      expect(mockPrisma.user.create).not.toHaveBeenCalled()
    })

    it('stamps emailVerified and fills a blank name when linking', async () => {
      notLinkedThenEmail({ id: 'store_1', clerkId: null, emailVerified: null, name: null, imageUrl: null })
      const { linkClerkUser } = await load()

      await linkClerkUser(identity())
      const { data } = mockPrisma.user.update.mock.calls[0][0]
      expect(data.emailVerified).toBeInstanceOf(Date)
      expect(data.name).toBe('Priya Sharma')
    })

    it('relinks an account whose stored Clerk id is stale', async () => {
      notLinkedThenEmail({
        id: 'store_1',
        clerkId: 'user_clerk_OLD',
        emailVerified: new Date('2026-01-01'),
        name: 'Priya',
        imageUrl: null,
      })
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { linkClerkUser } = await load()

      expect(await linkClerkUser(identity())).toBe('store_1')
      expect(mockPrisma.user.update.mock.calls[0][0].data.clerkId).toBe('user_clerk_1')
      warn.mockRestore()
    })

    it('creates a new user with a cart and a wishlist', async () => {
      notLinkedThenEmail(null)
      mockPrisma.user.create.mockResolvedValue({ id: 'store_new' })
      const { linkClerkUser } = await load()

      expect(await linkClerkUser(identity())).toBe('store_new')
      expect(mockPrisma.user.create.mock.calls[0][0].data).toMatchObject({
        clerkId: 'user_clerk_1',
        email: 'priya@example.com',
        name: 'Priya Sharma',
        role: 'USER',
      })
      expect(mockPrisma.cart.create).toHaveBeenCalledWith({ data: { userId: 'store_new' } })
      expect(mockPrisma.wishlist.create).toHaveBeenCalledWith({ data: { userId: 'store_new' } })
    })

    it('settles on the winner when two first requests race to create', async () => {
      notLinkedThenEmail(null)
      mockPrisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        })
      )
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'store_winner' })
      const { linkClerkUser } = await load()

      expect(await linkClerkUser(identity())).toBe('store_winner')
      expect(mockPrisma.cart.create).not.toHaveBeenCalled()
    })
  })

  describe('syncClerkUser', () => {
    it('follows an email change made in Clerk', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce({ id: 'store_1' })
      mockPrisma.user.findUnique.mockResolvedValue({
        email: 'old@example.com',
        name: 'Priya',
        imageUrl: null,
      })
      const { syncClerkUser } = await load()

      await syncClerkUser(identity({ email: 'new@example.com' }))
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'store_1' },
        data: { email: 'new@example.com' },
      })
    })

    // The store owns the profile: a name set on the account page must survive.
    it("never overwrites the store's own name or photo", async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce({ id: 'store_1' })
      mockPrisma.user.findUnique.mockResolvedValue({
        email: 'priya@example.com',
        name: 'Name set in the store',
        imageUrl: 'https://res.cloudinary.com/x/p.jpg',
      })
      const { syncClerkUser } = await load()

      await syncClerkUser(identity({ name: 'Clerk Name', imageUrl: 'https://img.clerk.com/photo' }))
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })

    it('does not take an unverified new email', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce({ id: 'store_1' })
      mockPrisma.user.findUnique.mockResolvedValue({
        email: 'priya@example.com',
        name: 'Priya',
        imageUrl: null,
      })
      const { syncClerkUser } = await load()

      await syncClerkUser(identity({ email: 'unproven@example.com', emailVerified: false }))
      expect(mockPrisma.user.update).not.toHaveBeenCalled()
    })
  })

  describe('unlinkClerkUser', () => {
    it('detaches the sign-in and keeps the store user', async () => {
      const { unlinkClerkUser } = await load()

      await unlinkClerkUser('user_clerk_1')
      expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
        where: { clerkId: 'user_clerk_1' },
        data: { clerkId: null },
      })
    })
  })

  describe('deleteClerkUser', () => {
    it('treats a user Clerk no longer has as already deleted', async () => {
      mockDeleteUser.mockRejectedValue(Object.assign(new Error('Not Found'), { status: 404 }))
      const { deleteClerkUser } = await load()

      await expect(deleteClerkUser('user_clerk_1')).resolves.toBeUndefined()
    })

    it('surfaces any other failure', async () => {
      mockDeleteUser.mockRejectedValue(Object.assign(new Error('boom'), { status: 500 }))
      const { deleteClerkUser } = await load()

      await expect(deleteClerkUser('user_clerk_1')).rejects.toThrow('boom')
    })
  })
})
