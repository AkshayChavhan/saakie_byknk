import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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

// The global setup mock pins the location; override it here so each test can
// place the header on a specific URL, query string included.
const location = vi.hoisted(() => ({ pathname: '/', search: '' }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => location.pathname,
  useSearchParams: () => new URLSearchParams(location.search),
}))

const at = (pathname: string, search = '') => {
  location.pathname = pathname
  location.search = search
}

/** The class each nav variant uses to mark its active link. */
const ACTIVE_MARKERS = ['font-semibold', 'bg-white/15', 'bg-rose-600']
const NAV_LABELS = ['Home', 'New Arrivals', 'All Products', 'Sale', 'Posts']

/** Nav labels currently rendered with active styling, in any variant. */
const activeNavLabels = () =>
  NAV_LABELS.filter((label) =>
    screen
      .queryAllByText(label)
      .some((el) => ACTIVE_MARKERS.some((c) => el.className.includes(c)))
  )

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
    at('/')
  })

  describe('active nav highlighting', () => {
    it('highlights Sale — not All Products — on /products?sale=true', () => {
      at('/products', 'sale=true')

      render(<Header />)

      expect(activeNavLabels()).toEqual(['Sale'])
    })

    it('highlights New Arrivals on /products?sort=newest', () => {
      at('/products', 'sort=newest')

      render(<Header />)

      expect(activeNavLabels()).toEqual(['New Arrivals'])
    })

    it('highlights All Products on a bare /products', () => {
      at('/products')

      render(<Header />)

      expect(activeNavLabels()).toEqual(['All Products'])
    })

    it('keeps Sale highlighted alongside unrelated params', () => {
      at('/products', 'sale=true&page=2')

      render(<Header />)

      expect(activeNavLabels()).toEqual(['Sale'])
    })

    it('falls back to All Products for a filter the nav does not name', () => {
      at('/products', 'category=pure-silk')

      render(<Header />)

      expect(activeNavLabels()).toEqual(['All Products'])
    })

    it('does not highlight Sale when the param is not true', () => {
      at('/products', 'sale=false')

      render(<Header />)

      expect(activeNavLabels()).toEqual(['All Products'])
    })

    it('highlights Home on the root path', () => {
      at('/')

      render(<Header />)

      expect(activeNavLabels()).toEqual(['Home'])
    })

    it('highlights nothing on an unrelated page', () => {
      at('/about')

      render(<Header />)

      expect(activeNavLabels()).toEqual([])
    })
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

  it('shows the account link when user is authenticated', () => {
    mockUseSession.mockReturnValue(signedIn())

    render(<Header />)

    // Account is a direct link to /account (no dropdown menu).
    expect(screen.getByLabelText('Account')).toBeInTheDocument()
  })

  it('shows cart icon when user is authenticated', () => {
    mockUseSession.mockReturnValue(signedIn())

    render(<Header />)

    expect(screen.getByTestId('cart-icon')).toBeInTheDocument()
  })

  it('shows an Admin link pointing to /admin for admin users', () => {
    mockUseSession.mockReturnValue(signedIn('ADMIN'))

    render(<Header />)

    // The desktop nav renders "Admin" links (main nav + category bar); the
    // mobile menu's "Admin Dashboard" link only mounts when the hamburger
    // is opened. All "Admin" links target /admin.
    const adminLinks = screen.getAllByRole('link', { name: 'Admin' })
    expect(adminLinks.length).toBeGreaterThan(0)
    adminLinks.forEach((link) => expect(link).toHaveAttribute('href', '/admin'))
  })

  it('does not show an Admin link for non-admin users', () => {
    mockUseSession.mockReturnValue(signedIn('USER'))

    render(<Header />)

    expect(screen.queryAllByRole('link', { name: 'Admin' })).toHaveLength(0)
  })

  it('does not show the account link when user is not authenticated', () => {
    mockUseSession.mockReturnValue(signedOut())

    render(<Header />)

    expect(screen.queryByLabelText('Account')).not.toBeInTheDocument()
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
