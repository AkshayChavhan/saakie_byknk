import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { CartIcon } from '@/components/cart/cart-icon'

// Mock Clerk
const mockUseUser = vi.fn()
vi.mock('@clerk/nextjs', () => ({
  useUser: () => mockUseUser(),
}))

describe('CartIcon component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows sign-in link when user is not loaded', () => {
    mockUseUser.mockReturnValue({
      user: null,
      isLoaded: false,
    })

    render(<CartIcon />)

    // When not loaded, it should show sign-in link
    expect(screen.getByRole('link')).toHaveAttribute('href', '/sign-in')
  })

  it('shows sign-in link when user is not authenticated', () => {
    mockUseUser.mockReturnValue({
      user: null,
      isLoaded: true,
    })

    render(<CartIcon />)

    expect(screen.getByRole('link')).toHaveAttribute('href', '/sign-in')
  })

  it('shows cart link for authenticated user', async () => {
    mockUseUser.mockReturnValue({
      user: { id: 'user_123' },
      isLoaded: true,
    })

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
    mockUseUser.mockReturnValue({
      user: { id: 'user_123' },
      isLoaded: true,
    })

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
    mockUseUser.mockReturnValue({
      user: { id: 'user_123' },
      isLoaded: true,
    })

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
    mockUseUser.mockReturnValue({
      user: { id: 'user_123' },
      isLoaded: true,
    })

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
    mockUseUser.mockReturnValue({
      user: { id: 'user_123' },
      isLoaded: true,
    })

    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ itemCount: 3 }),
    })

    render(<CartIcon />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/cart')
    })
  })

  it('does not fetch cart for unauthenticated user', () => {
    mockUseUser.mockReturnValue({
      user: null,
      isLoaded: true,
    })

    render(<CartIcon />)

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('handles fetch error gracefully', async () => {
    mockUseUser.mockReturnValue({
      user: { id: 'user_123' },
      isLoaded: true,
    })

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
    mockUseUser.mockReturnValue({
      user: { id: 'user_123' },
      isLoaded: true,
    })

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
    mockUseUser.mockReturnValue({
      user: null,
      isLoaded: true,
    })

    render(<CartIcon />)

    // The ShoppingCart icon from lucide-react should be rendered
    const link = screen.getByRole('link')
    expect(link.querySelector('svg')).toBeInTheDocument()
  })
})
