import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { FeaturedProducts } from '@/components/home/featured-products'

describe('FeaturedProducts component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const mockProducts = [
    {
      id: 'prod_1',
      name: 'Silk Saree',
      price: 5999,
      comparePrice: 7999,
      rating: 4.5,
      reviews: 20,
      image: 'https://example.com/saree.jpg',
      colors: ['#FF0000', '#00FF00'],
      isNew: true,
      isBestseller: false,
    },
    {
      id: 'prod_2',
      name: 'Cotton Saree',
      price: 2999,
      comparePrice: 3999,
      rating: 4.2,
      reviews: 15,
      image: 'https://example.com/cotton.jpg',
      colors: ['#0000FF'],
      isNew: false,
      isBestseller: true,
    },
  ]

  it('shows loading skeleton initially', () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    render(<FeaturedProducts />)

    // Check for skeleton elements
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renders products after successful fetch', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockProducts),
    })

    render(<FeaturedProducts />)

    await waitFor(() => {
      expect(screen.getByText('Silk Saree')).toBeInTheDocument()
      expect(screen.getByText('Cotton Saree')).toBeInTheDocument()
    })
  })

  it('displays section title', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    render(<FeaturedProducts />)

    expect(screen.getByText('Featured Products')).toBeInTheDocument()
    expect(screen.getByText('Handpicked sarees for the discerning woman')).toBeInTheDocument()
  })

  it('displays View All link', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    render(<FeaturedProducts />)

    const viewAllLink = screen.getByText(/View All Products/i)
    expect(viewAllLink).toHaveAttribute('href', '/products')
  })

  it('shows error state when fetch fails', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
    })

    render(<FeaturedProducts />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load featured products')).toBeInTheDocument()
    })
  })

  it('shows Try Again button on error', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
    })

    render(<FeaturedProducts />)

    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })
  })

  it('retries fetch when Try Again is clicked', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockProducts) })

    render(<FeaturedProducts />)

    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Try Again'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })
  })

  it('shows empty state when no products', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    render(<FeaturedProducts />)

    await waitFor(() => {
      expect(screen.getByText('No featured products available')).toBeInTheDocument()
    })
  })

  it('displays NEW badge for new products', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockProducts),
    })

    render(<FeaturedProducts />)

    await waitFor(() => {
      expect(screen.getByText('NEW')).toBeInTheDocument()
    })
  })

  it('displays BESTSELLER badge for bestseller products', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockProducts),
    })

    render(<FeaturedProducts />)

    await waitFor(() => {
      expect(screen.getByText('BESTSELLER')).toBeInTheDocument()
    })
  })

  it('displays discount percentage', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockProducts),
    })

    render(<FeaturedProducts />)

    await waitFor(() => {
      // Silk Saree: (7999 - 5999) / 7999 * 100 = 25% off
      const discountElements = screen.getAllByText('25% OFF')
      expect(discountElements.length).toBeGreaterThan(0)
    })
  })

  it('displays product prices', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockProducts),
    })

    render(<FeaturedProducts />)

    await waitFor(() => {
      // Prices should be formatted in INR
      expect(screen.getByText(/₹5,999/)).toBeInTheDocument()
      expect(screen.getByText(/₹7,999/)).toBeInTheDocument()
    })
  })

  it('displays product rating and review count', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockProducts),
    })

    render(<FeaturedProducts />)

    await waitFor(() => {
      expect(screen.getByText('4.5 (20)')).toBeInTheDocument()
    })
  })

  it('displays color swatches', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockProducts),
    })

    const { container } = render(<FeaturedProducts />)

    await waitFor(() => {
      // Find color swatch divs with specific background colors
      const colorSwatches = container.querySelectorAll('[style*="background-color"]')
      expect(colorSwatches.length).toBeGreaterThan(0)
    })
  })

  it('links to product detail page', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockProducts),
    })

    render(<FeaturedProducts />)

    await waitFor(() => {
      const productLinks = screen.getAllByRole('link', { name: /Silk Saree|Cotton Saree/i })
      expect(productLinks.length).toBeGreaterThan(0)
      expect(productLinks[0]).toHaveAttribute('href', '/products/prod_1')
    })
  })

  it('has wishlist button for products', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockProducts),
    })

    const { container } = render(<FeaturedProducts />)

    await waitFor(() => {
      expect(screen.getByText('Silk Saree')).toBeInTheDocument()
    })

    // Find wishlist buttons
    const wishlistButtons = container.querySelectorAll('button')
    expect(wishlistButtons.length).toBeGreaterThan(0)
  })

  it('fetches from correct API endpoint', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    render(<FeaturedProducts />)

    expect(global.fetch).toHaveBeenCalledWith('/api/products/featured')
  })

  it('handles network errors gracefully', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))

    render(<FeaturedProducts />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load featured products')).toBeInTheDocument()
    })
  })
})
