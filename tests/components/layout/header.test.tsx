import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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

// The header pulls its category tree over fetchApi; hoisted so the mock
// factory below can reach it.
const api = vi.hoisted(() => ({ fetchApi: vi.fn() }))
vi.mock('@/lib/api', () => ({ fetchApi: api.fetchApi }))

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
const NAV_LABELS = ['Home', 'New Arrivals', 'Categories', 'Sale', 'Posts']

/** Nav labels currently rendered with active styling, in any variant. */
const activeNavLabels = () =>
  NAV_LABELS.filter((label) =>
    screen
      .queryAllByText(label)
      .some((el) => ACTIVE_MARKERS.some((c) => el.className.includes(c)))
  )

/** A tree covering both shapes: one category with children, one without. */
const CATEGORY_TREE = [
  {
    id: 'cat_silk',
    name: 'Pure Silk',
    slug: 'pure-silk',
    children: [
      { id: 'sub_kora', name: 'Kora Silk', slug: 'kora-silk' },
      { id: 'sub_muslin', name: 'Muslin Silk', slug: 'muslin-silk' },
    ],
  },
  { id: 'cat_cotton', name: 'Pure Cotton Silk', slug: 'pure-cotton-silk', children: [] },
]

/**
 * Renders the header with the category tree already in the query cache, so
 * the dropdown is present on the first render and every assertion stays
 * synchronous. `staleTime` in the component keeps seeded data fresh, so no
 * request goes out — the fetch path has its own test below.
 */
const renderHeader = (tree: unknown[] = CATEGORY_TREE) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(['category-nav'], tree)
  return render(
    <QueryClientProvider client={queryClient}>
      <Header />
    </QueryClientProvider>
  )
}

/** Opens the desktop Categories dropdown (the mobile strip renders one too). */
const openCategories = () => {
  const triggers = screen.getAllByRole('button', { name: /Categories/ })
  fireEvent.click(triggers[0])
  return triggers[0]
}

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
    api.fetchApi.mockResolvedValue({ ok: true, json: async () => CATEGORY_TREE })
    at('/')
  })

  describe('active nav highlighting', () => {
    it('highlights Sale on /products?sale=true', () => {
      at('/products', 'sale=true')

      renderHeader()

      expect(activeNavLabels()).toEqual(['Sale'])
    })

    it('highlights New Arrivals on /products?sort=newest', () => {
      at('/products', 'sort=newest')

      renderHeader()

      expect(activeNavLabels()).toEqual(['New Arrivals'])
    })

    // The flat "All Products" link gave way to the Categories dropdown, so a
    // bare /products no longer has a nav entry of its own to light up.
    it('highlights nothing on a bare /products', () => {
      at('/products')

      renderHeader()

      expect(activeNavLabels()).toEqual([])
    })

    it('keeps Sale highlighted alongside unrelated params', () => {
      at('/products', 'sale=true&page=2')

      renderHeader()

      expect(activeNavLabels()).toEqual(['Sale'])
    })

    it('does not highlight Sale when the param is not true', () => {
      at('/products', 'sale=false')

      renderHeader()

      expect(activeNavLabels()).toEqual([])
    })

    it('highlights Categories on the category index', () => {
      at('/categories')

      renderHeader()

      expect(activeNavLabels()).toEqual(['Categories'])
    })

    it('highlights Categories on a single category page', () => {
      at('/categories/pure-silk')

      renderHeader()

      expect(activeNavLabels()).toEqual(['Categories'])
    })

    it('highlights Home on the root path', () => {
      at('/')

      renderHeader()

      expect(activeNavLabels()).toEqual(['Home'])
    })

    it('highlights nothing on an unrelated page', () => {
      at('/about')

      renderHeader()

      expect(activeNavLabels()).toEqual([])
    })
  })

  describe('categories dropdown', () => {
    it('stays closed until the trigger is clicked', () => {
      renderHeader()

      expect(screen.queryByRole('link', { name: 'Pure Silk' })).not.toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: /Categories/ })[0]).toHaveAttribute(
        'aria-expanded',
        'false'
      )
    })

    it('lists categories with their sub-categories once opened', () => {
      renderHeader()

      const trigger = openCategories()

      expect(trigger).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByRole('link', { name: 'Pure Silk' })).toHaveAttribute(
        'href',
        '/categories/pure-silk'
      )
      expect(screen.getByRole('link', { name: 'Kora Silk' })).toHaveAttribute(
        'href',
        '/categories/kora-silk'
      )
      expect(screen.getByRole('link', { name: 'Muslin Silk' })).toHaveAttribute(
        'href',
        '/categories/muslin-silk'
      )
    })

    it('renders a category without sub-categories as a plain link', () => {
      renderHeader()
      openCategories()

      // Present in its own right, with nothing nested beneath it.
      const cotton = screen.getByRole('link', { name: 'Pure Cotton Silk' })
      expect(cotton).toHaveAttribute('href', '/categories/pure-cotton-silk')
      expect(cotton.parentElement?.querySelectorAll('a')).toHaveLength(1)
    })

    it('keeps the unfiltered listing reachable from the panel', () => {
      renderHeader()
      openCategories()

      expect(screen.getByRole('link', { name: 'All Products' })).toHaveAttribute(
        'href',
        '/products'
      )
    })

    it('closes again when the trigger is clicked a second time', () => {
      renderHeader()

      const trigger = openCategories()
      fireEvent.click(trigger)

      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByRole('link', { name: 'Pure Silk' })).not.toBeInTheDocument()
    })

    it('drops sub-categories the API pruned for having no products', () => {
      renderHeader([
        { id: 'cat_silk', name: 'Pure Silk', slug: 'pure-silk', children: [] },
      ])
      openCategories()

      expect(screen.getByRole('link', { name: 'Pure Silk' })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Kora Silk' })).not.toBeInTheDocument()
    })

    it('hides the entry entirely when no category has products', () => {
      renderHeader([])

      expect(screen.queryAllByRole('button', { name: /Categories/ })).toHaveLength(0)
    })

    it('loads the tree from /api/categories/nav when not already cached', async () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      render(
        <QueryClientProvider client={queryClient}>
          <Header />
        </QueryClientProvider>
      )

      await screen.findAllByRole('button', { name: /Categories/ })
      expect(api.fetchApi).toHaveBeenCalledWith('/api/categories/nav')
    })
  })

  it('renders the logo', () => {
    renderHeader()

    const logo = screen.getByAltText('Saakie by KNK')
    expect(logo).toBeInTheDocument()
  })

  it('renders main navigation links in desktop view', () => {
    renderHeader()

    const homeLinks = screen.getAllByText('Home')
    expect(homeLinks.length).toBeGreaterThan(0)

    const newArrivalsLinks = screen.getAllByText('New Arrivals')
    expect(newArrivalsLinks.length).toBeGreaterThan(0)
  })

  it('shows Sign In link when user is not authenticated', () => {
    mockUseSession.mockReturnValue(signedOut())

    renderHeader()

    expect(screen.getByText('Sign In')).toBeInTheDocument()
  })

  it('shows the account link when user is authenticated', () => {
    mockUseSession.mockReturnValue(signedIn())

    renderHeader()

    // Account is a direct link to /account (no dropdown menu).
    expect(screen.getByLabelText('Account')).toBeInTheDocument()
  })

  it('shows cart icon when user is authenticated', () => {
    mockUseSession.mockReturnValue(signedIn())

    renderHeader()

    expect(screen.getByTestId('cart-icon')).toBeInTheDocument()
  })

  it('shows an Admin link pointing to /admin for admin users', () => {
    mockUseSession.mockReturnValue(signedIn('ADMIN'))

    renderHeader()

    // The desktop nav renders "Admin" links (main nav + category bar); the
    // mobile menu's "Admin Dashboard" link only mounts when the hamburger
    // is opened. All "Admin" links target /admin.
    const adminLinks = screen.getAllByRole('link', { name: 'Admin' })
    expect(adminLinks.length).toBeGreaterThan(0)
    adminLinks.forEach((link) => expect(link).toHaveAttribute('href', '/admin'))
  })

  it('does not show an Admin link for non-admin users', () => {
    mockUseSession.mockReturnValue(signedIn('USER'))

    renderHeader()

    expect(screen.queryAllByRole('link', { name: 'Admin' })).toHaveLength(0)
  })

  it('does not show the account link when user is not authenticated', () => {
    mockUseSession.mockReturnValue(signedOut())

    renderHeader()

    expect(screen.queryByLabelText('Account')).not.toBeInTheDocument()
  })

  it('has sticky header styling', () => {
    const { container } = renderHeader()

    const header = container.querySelector('header')
    expect(header).toHaveClass('sticky', 'top-0', 'z-50')
  })

  it('links logo to home page', () => {
    renderHeader()

    const logoLink = screen.getByRole('link', { name: /Saakie by KNK/i })
    expect(logoLink).toHaveAttribute('href', '/')
  })

  it('sign in link points to sign-in page', () => {
    mockUseSession.mockReturnValue(signedOut())

    renderHeader()

    const signInLink = screen.getByRole('link', { name: /Sign In/i })
    expect(signInLink).toHaveAttribute('href', '/sign-in')
  })

  it('navigation links have correct hrefs', () => {
    renderHeader()

    const homeLinks = screen.getAllByRole('link', { name: 'Home' })
    expect(homeLinks[0]).toHaveAttribute('href', '/')

    const saleLinks = screen.getAllByRole('link', { name: 'Sale' })
    expect(saleLinks[0]).toHaveAttribute('href', '/products?sale=true')
  })
})
