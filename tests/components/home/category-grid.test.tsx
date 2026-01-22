import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { CategoryGrid } from '@/components/home/category-grid'

describe('CategoryGrid component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const mockCategories = [
    {
      id: 'cat_1',
      name: 'Silk Sarees',
      slug: 'silk-sarees',
      image: 'https://example.com/silk.jpg',
      count: 45,
    },
    {
      id: 'cat_2',
      name: 'Cotton Sarees',
      slug: 'cotton-sarees',
      image: 'https://example.com/cotton.jpg',
      count: 32,
    },
    {
      id: 'cat_3',
      name: 'Designer Sarees',
      slug: 'designer-sarees',
      image: 'https://example.com/designer.jpg',
      count: 18,
    },
  ]

  it('shows loading skeleton initially', () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    render(<CategoryGrid />)

    // Check for skeleton elements
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renders categories after successful fetch', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCategories),
    })

    render(<CategoryGrid />)

    await waitFor(() => {
      expect(screen.getByText('Silk Sarees')).toBeInTheDocument()
      expect(screen.getByText('Cotton Sarees')).toBeInTheDocument()
      expect(screen.getByText('Designer Sarees')).toBeInTheDocument()
    })
  })

  it('displays section title and description', () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    render(<CategoryGrid />)

    expect(screen.getByText('Shop by Category')).toBeInTheDocument()
    expect(screen.getByText(/Browse through our curated collection/)).toBeInTheDocument()
  })

  it('shows error state when fetch fails', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
    })

    render(<CategoryGrid />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load categories')).toBeInTheDocument()
    })
  })

  it('shows Try Again button on error', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
    })

    render(<CategoryGrid />)

    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })
  })

  it('retries fetch when Try Again is clicked', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockCategories) })

    render(<CategoryGrid />)

    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Try Again'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })
  })

  it('shows empty state when no categories', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    render(<CategoryGrid />)

    await waitFor(() => {
      expect(screen.getByText('No categories available')).toBeInTheDocument()
    })
  })

  it('displays product count for each category', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCategories),
    })

    render(<CategoryGrid />)

    await waitFor(() => {
      expect(screen.getByText('45 Products')).toBeInTheDocument()
      expect(screen.getByText('32 Products')).toBeInTheDocument()
      expect(screen.getByText('18 Products')).toBeInTheDocument()
    })
  })

  it('links to category page', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCategories),
    })

    render(<CategoryGrid />)

    await waitFor(() => {
      const silkLink = screen.getByRole('link', { name: /Silk Sarees/i })
      expect(silkLink).toHaveAttribute('href', '/categories/silk-sarees')
    })
  })

  it('renders category images', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCategories),
    })

    render(<CategoryGrid />)

    await waitFor(() => {
      const images = screen.getAllByRole('img')
      expect(images.length).toBe(mockCategories.length)
      expect(images[0]).toHaveAttribute('alt', 'Silk Sarees')
    })
  })

  it('fetches from correct API endpoint', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    render(<CategoryGrid />)

    expect(global.fetch).toHaveBeenCalledWith('/api/categories')
  })

  it('handles network errors gracefully', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))

    render(<CategoryGrid />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load categories')).toBeInTheDocument()
    })
  })

  it('renders grid layout', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCategories),
    })

    const { container } = render(<CategoryGrid />)

    await waitFor(() => {
      const grid = container.querySelector('.grid')
      expect(grid).toBeInTheDocument()
      expect(grid).toHaveClass('grid-cols-2', 'md:grid-cols-3')
    })
  })
})
