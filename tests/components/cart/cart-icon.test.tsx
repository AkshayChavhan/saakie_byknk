import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { CartIcon } from '@/components/cart/cart-icon'

// Mock Auth.js client session
const mockUseSession = vi.fn()
vi.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}))

// Helper: build a useSession() return value from a simple signed-in flag.
const sessionState = (opts: { loaded: boolean; signedIn: boolean }) => {
  if (!opts.loaded) return { data: null, status: 'loading' as const }
  if (!opts.signedIn) return { data: null, status: 'unauthenticated' as const }
  return {
    data: { user: { id: 'user_123', role: 'USER' }, expires: '2099-01-01' },
    status: 'authenticated' as const,
  }
}

describe('CartIcon component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows sign-in link when user is not loaded', () => {
    mockUseSession.mockReturnValue(sessionState({ loaded: false, signedIn: false }))

    render(<CartIcon />)

    // When not loaded, it should show sign-in link
    expect(screen.getByRole('link')).toHaveAttribute('href', '/sign-in')
  })

  it('shows sign-in link when user is not authenticated', () => {
    mockUseSession.mockReturnValue(sessionState({ loaded: true, signedIn: false }))

    render(<CartIcon />)

    expect(screen.getByRole('link')).toHaveAttribute('href', '/sign-in')
  })

  it('shows cart link for authenticated user', async () => {
    mockUseSession.mockReturnValue(sessionState({ loaded: true, signedIn: true }))

    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ itemCount: 0 }),
    })

    render(<CartIcon />)

    await waitFor(() => {
      expect(screen.getByRole('link')).toHaveAttribute('href', '/cart')
    })
  })

  it('displays item count badge when cart has items', async () => {
    mockUseSession.mockReturnValue(sessionState({ loaded: true, signedIn: true }))

    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ itemCount: 5 }),
    })

    render(<CartIcon />)

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument()
    })
  })

  it('displays 99+ when item count exceeds 99', async () => {
    mockUseSession.mockReturnValue(sessionState({ loaded: true, signedIn: true }))

    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ itemCount: 150 }),
    })

    render(<CartIcon />)

    await waitFor(() => {
      expect(screen.getByText('99+')).toBeInTheDocument()
    })
  })

  it('does not display badge when cart is empty', async () => {
    mockUseSession.mockReturnValue(sessionState({ loaded: true, signedIn: true }))

    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ itemCount: 0 }),
    })

    render(<CartIcon />)

    // Wait for fetch to complete
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })

    // The badge should not be present when item count is 0
    const badges = screen.queryAllByText(/^\d+$/)
    expect(badges.length).toBe(0)
  })

  it('fetches cart count on mount for authenticated user', async () => {
    mockUseSession.mockReturnValue(sessionState({ loaded: true, signedIn: true }))

    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ itemCount: 3 }),
    })

    render(<CartIcon />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/cart', expect.any(Object))
    })
  })

  it('does not fetch cart for unauthenticated user', () => {
    mockUseSession.mockReturnValue(sessionState({ loaded: true, signedIn: false }))

    render(<CartIcon />)

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('handles fetch error gracefully', async () => {
    mockUseSession.mockReturnValue(sessionState({ loaded: true, signedIn: true }))

    ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))

    // Should not throw
    render(<CartIcon />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })

    // Component should still render without crashing
    expect(screen.getByRole('link')).toBeInTheDocument()
  })

  it('handles non-ok response gracefully', async () => {
    mockUseSession.mockReturnValue(sessionState({ loaded: true, signedIn: true }))

    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
    })

    render(<CartIcon />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })

    // Component should still render
    expect(screen.getByRole('link')).toBeInTheDocument()
  })

  it('renders shopping cart icon', () => {
    mockUseSession.mockReturnValue(sessionState({ loaded: true, signedIn: false }))

    render(<CartIcon />)

    // The ShoppingCart icon from lucide-react should be rendered
    const link = screen.getByRole('link')
    expect(link.querySelector('svg')).toBeInTheDocument()
  })
})
