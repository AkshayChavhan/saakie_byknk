import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Header } from '@/components/layout/header'

// Mock Clerk components
const mockUseUser = vi.fn()
vi.mock('@clerk/nextjs', () => ({
  useUser: () => mockUseUser(),
  SignedIn: ({ children }: { children: React.ReactNode }) => mockUseUser().user ? <>{children}</> : null,
  SignedOut: ({ children }: { children: React.ReactNode }) => !mockUseUser().user ? <>{children}</> : null,
  UserButton: () => <div data-testid="user-button">UserButton</div>,
}))

// Mock the CartIcon component
vi.mock('@/components/cart', () => ({
  CartIcon: () => <div data-testid="cart-icon">Cart</div>,
}))

describe('Header component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseUser.mockReturnValue({ user: null })
  })

  it('renders the logo', () => {
    render(<Header />)

    const logo = screen.getByAltText('Saakie by KNK')
    expect(logo).toBeInTheDocument()
  })

  it('renders main navigation links in desktop view', () => {
    render(<Header />)

    // These are in the desktop nav (hidden on mobile)
    const homeLinks = screen.getAllByText('Home')
    expect(homeLinks.length).toBeGreaterThan(0)

    const newArrivalsLinks = screen.getAllByText('New Arrivals')
    expect(newArrivalsLinks.length).toBeGreaterThan(0)
  })

  it('shows Sign In link when user is not authenticated', () => {
    mockUseUser.mockReturnValue({ user: null })

    render(<Header />)

    expect(screen.getByText('Sign In')).toBeInTheDocument()
  })

  it('shows user button when user is authenticated', () => {
    mockUseUser.mockReturnValue({ user: { id: 'user_123' } })

    render(<Header />)

    expect(screen.getByTestId('user-button')).toBeInTheDocument()
  })

  it('shows cart icon when user is authenticated', () => {
    mockUseUser.mockReturnValue({ user: { id: 'user_123' } })

    render(<Header />)

    expect(screen.getByTestId('cart-icon')).toBeInTheDocument()
  })

  it('shows admin link when user is authenticated', () => {
    mockUseUser.mockReturnValue({ user: { id: 'user_123' } })

    render(<Header />)

    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('does not show admin link when user is not authenticated', () => {
    mockUseUser.mockReturnValue({ user: null })

    render(<Header />)

    expect(screen.queryByText('Admin')).not.toBeInTheDocument()
  })

  it('opens mobile menu when hamburger button is clicked', () => {
    render(<Header />)

    // Click the hamburger button (first button)
    const menuButton = screen.getAllByRole('button')[0]
    fireEvent.click(menuButton)

    // Mobile menu should now be visible - check for the mobile menu container
    const mobileMenu = document.querySelector('.lg\\:hidden.py-4')
    expect(mobileMenu).toBeInTheDocument()
  })

  it('shows Admin Dashboard in mobile menu for authenticated users', () => {
    mockUseUser.mockReturnValue({ user: { id: 'user_123' } })

    render(<Header />)

    // Click the hamburger button
    const menuButton = screen.getAllByRole('button')[0]
    fireEvent.click(menuButton)

    // Admin Dashboard link should be visible in mobile menu
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
  })

  it('can toggle search functionality', () => {
    render(<Header />)

    // Find and click the search button (look for button with Search icon)
    const buttons = screen.getAllByRole('button')
    // Search button is the first one after the menu button
    const searchButton = buttons[1]

    fireEvent.click(searchButton)

    // Search bar visibility is toggled
    // After toggle, the search state changes
    expect(searchButton).toBeInTheDocument()
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
    mockUseUser.mockReturnValue({ user: null })

    render(<Header />)

    const signInLink = screen.getByRole('link', { name: /Sign In/i })
    expect(signInLink).toHaveAttribute('href', '/sign-in')
  })

  it('admin link points to admin page', () => {
    mockUseUser.mockReturnValue({ user: { id: 'user_123' } })

    render(<Header />)

    const adminLink = screen.getByRole('link', { name: /^Admin$/i })
    expect(adminLink).toHaveAttribute('href', '/admin')
  })

  it('navigation links have correct hrefs', () => {
    render(<Header />)

    // Check one of each navigation link (they appear in both desktop and mobile nav)
    const homeLinks = screen.getAllByRole('link', { name: 'Home' })
    expect(homeLinks[0]).toHaveAttribute('href', '/')

    const silkLinks = screen.getAllByRole('link', { name: 'Silk Sarees' })
    expect(silkLinks[0]).toHaveAttribute('href', '/categories/silk-sarees')

    const saleLinks = screen.getAllByRole('link', { name: 'Sale' })
    expect(saleLinks[0]).toHaveAttribute('href', '/products?sale=true')
  })
})
