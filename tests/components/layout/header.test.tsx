import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Header } from '@/components/layout/header'

// Mock Auth.js client session
const mockUseSession = vi.fn()
vi.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
  signOut: vi.fn(),
}))

// Mock the CartIcon component
vi.mock('@/components/cart', () => ({
  CartIcon: () => <div data-testid="cart-icon">Cart</div>,
}))

// Helper: build a useSession() return value.
const signedOut = () => ({ data: null, status: 'unauthenticated' as const })
const signedIn = (role = 'USER') => ({
  data: {
    user: { id: 'user_123', email: 'test@example.com', name: 'Test User', role },
    expires: '2099-01-01',
  },
  status: 'authenticated' as const,
})

describe('Header component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSession.mockReturnValue(signedOut())
  })

  it('renders the logo', () => {
    render(<Header />)

    const logo = screen.getByAltText('Saakie by KNK')
    expect(logo).toBeInTheDocument()
  })

  it('renders main navigation links in desktop view', () => {
    render(<Header />)

    const homeLinks = screen.getAllByText('Home')
    expect(homeLinks.length).toBeGreaterThan(0)

    const newArrivalsLinks = screen.getAllByText('New Arrivals')
    expect(newArrivalsLinks.length).toBeGreaterThan(0)
  })

  it('shows Sign In link when user is not authenticated', () => {
    mockUseSession.mockReturnValue(signedOut())

    render(<Header />)

    expect(screen.getByText('Sign In')).toBeInTheDocument()
  })

  it('shows account menu button when user is authenticated', () => {
    mockUseSession.mockReturnValue(signedIn())

    render(<Header />)

    expect(screen.getByLabelText('Account menu')).toBeInTheDocument()
  })

  it('shows cart icon when user is authenticated', () => {
    mockUseSession.mockReturnValue(signedIn())

    render(<Header />)

    expect(screen.getByTestId('cart-icon')).toBeInTheDocument()
  })

  it('shows Admin Dashboard in account menu for admin users', () => {
    mockUseSession.mockReturnValue(signedIn('ADMIN'))

    render(<Header />)

    // Admin link lives inside the account dropdown — open it first.
    fireEvent.click(screen.getByLabelText('Account menu'))

    const adminLink = screen.getByRole('link', { name: /Admin Dashboard/i })
    expect(adminLink).toHaveAttribute('href', '/admin')
  })

  it('does not show Admin Dashboard for non-admin users', () => {
    mockUseSession.mockReturnValue(signedIn('USER'))

    render(<Header />)

    fireEvent.click(screen.getByLabelText('Account menu'))

    expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument()
  })

  it('does not show account menu when user is not authenticated', () => {
    mockUseSession.mockReturnValue(signedOut())

    render(<Header />)

    expect(screen.queryByLabelText('Account menu')).not.toBeInTheDocument()
  })

  it('shows a Sign Out option in the account menu', () => {
    mockUseSession.mockReturnValue(signedIn())

    render(<Header />)

    fireEvent.click(screen.getByLabelText('Account menu'))

    expect(screen.getByText('Sign Out')).toBeInTheDocument()
  })

  it('has sticky header styling', () => {
    const { container } = render(<Header />)

    const header = container.querySelector('header')
    expect(header).toHaveClass('sticky', 'top-0', 'z-50')
  })

  it('links logo to home page', () => {
    render(<Header />)

    const logoLink = screen.getByRole('link', { name: /Saakie by KNK/i })
    expect(logoLink).toHaveAttribute('href', '/')
  })

  it('sign in link points to sign-in page', () => {
    mockUseSession.mockReturnValue(signedOut())

    render(<Header />)

    const signInLink = screen.getByRole('link', { name: /Sign In/i })
    expect(signInLink).toHaveAttribute('href', '/sign-in')
  })

  it('navigation links have correct hrefs', () => {
    render(<Header />)

    const homeLinks = screen.getAllByRole('link', { name: 'Home' })
    expect(homeLinks[0]).toHaveAttribute('href', '/')

    const saleLinks = screen.getAllByRole('link', { name: 'Sale' })
    expect(saleLinks[0]).toHaveAttribute('href', '/products?sale=true')
  })
})
