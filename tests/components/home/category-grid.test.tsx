import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { CategoryGrid } from '@/components/home/category-grid'

/**
 * The grid is prop-driven: the home page loads the cards on the server and
 * passes them in, so there is no loading state and no fetch to mock.
 */
const categories = [
  { id: 'cat_1', name: 'Silk Sarees', slug: 'silk-sarees', image: 'https://example.com/silk.jpg', count: 45 },
  { id: 'cat_2', name: 'Cotton Sarees', slug: 'cotton-sarees', image: 'https://example.com/cotton.jpg', count: 32 },
  { id: 'cat_3', name: 'Designer Sarees', slug: 'designer-sarees', image: '', count: 18 },
]

describe('CategoryGrid component', () => {
  it('renders every category it is given, synchronously', () => {
    render(<CategoryGrid categories={categories} />)

    expect(screen.getByText('Silk Sarees')).toBeInTheDocument()
    expect(screen.getByText('Cotton Sarees')).toBeInTheDocument()
    expect(screen.getByText('Designer Sarees')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('displays section title and description', () => {
    render(<CategoryGrid categories={[]} />)

    expect(screen.getByText('Shop by Category')).toBeInTheDocument()
    expect(screen.getByText(/Browse through our handpicked collection/)).toBeInTheDocument()
  })

  it('links each tile to its category page and announces the product count', () => {
    render(<CategoryGrid categories={categories} />)

    const link = screen.getByRole('listitem', { name: 'Silk Sarees - 45 products' })
    expect(link).toHaveAttribute('href', '/categories/silk-sarees')
    // The strip shows the name only; the count stays in the accessible label.
    expect(screen.queryByText('45 Products')).not.toBeInTheDocument()
  })

  it('renders the tiles as one horizontally scrollable, snapping row', () => {
    const { container } = render(<CategoryGrid categories={categories} />)
    const strip = container.querySelector('[role="list"]')
    expect(strip?.className).toContain('overflow-x-auto')
    expect(strip?.firstElementChild?.className).toContain('snap-x')
    expect(container.querySelectorAll('a.snap-start')).toHaveLength(3)
  })

  it('shows an empty state when there are no categories', () => {
    render(<CategoryGrid categories={[]} />)
    expect(screen.getByText('No categories available')).toBeInTheDocument()
  })

  it('falls back to an icon when a category has no image', () => {
    const { container } = render(<CategoryGrid categories={categories} />)
    // Two pictured categories (decorative, alt=""); the third renders the
    // folder icon instead.
    expect(container.querySelectorAll('img')).toHaveLength(2)
  })

  describe('slide arrows', () => {
    /** jsdom has no layout: fake the strip's geometry, then let it re-measure. */
    const layout = (strip: HTMLElement, scrollWidth: number, clientWidth: number, scrollLeft = 0) => {
      Object.defineProperty(strip, 'scrollWidth', { configurable: true, value: scrollWidth })
      Object.defineProperty(strip, 'clientWidth', { configurable: true, value: clientWidth })
      Object.defineProperty(strip, 'scrollLeft', { configurable: true, value: scrollLeft, writable: true })
      act(() => {
        fireEvent.scroll(strip)
      })
    }

    it('shows no arrows while every tile fits', () => {
      const { container } = render(<CategoryGrid categories={categories} />)
      layout(container.querySelector('[role="list"]') as HTMLElement, 600, 1000)
      expect(screen.queryByRole('button', { name: /categories/ })).not.toBeInTheDocument()
    })

    it('shows only the right arrow at the start of an overflowing strip, then both once scrolled', () => {
      const { container } = render(<CategoryGrid categories={categories} />)
      const strip = container.querySelector('[role="list"]') as HTMLElement

      layout(strip, 1600, 1000, 0)
      expect(screen.getByRole('button', { name: 'Show more categories' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Show previous categories' })).not.toBeInTheDocument()

      layout(strip, 1600, 1000, 300)
      expect(screen.getByRole('button', { name: 'Show more categories' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Show previous categories' })).toBeInTheDocument()

      layout(strip, 1600, 1000, 600)
      expect(screen.queryByRole('button', { name: 'Show more categories' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Show previous categories' })).toBeInTheDocument()
    })

    it('slides by whole visible tiles per click', () => {
      const { container } = render(<CategoryGrid categories={categories} />)
      const strip = container.querySelector('[role="list"]') as HTMLElement
      const scrollBy = vi.fn()
      strip.scrollBy = scrollBy
      const tiles = strip.querySelectorAll('a')
      Object.defineProperty(tiles[0], 'offsetLeft', { configurable: true, value: 0 })
      Object.defineProperty(tiles[1], 'offsetLeft', { configurable: true, value: 200 }) // tile + gap

      layout(strip, 1600, 1000, 300)
      fireEvent.click(screen.getByRole('button', { name: 'Show more categories' }))
      // 1000px wide shows 5 tiles of 200px → slide exactly 5 tiles.
      expect(scrollBy).toHaveBeenCalledWith({ left: 1000, behavior: 'smooth' })

      fireEvent.click(screen.getByRole('button', { name: 'Show previous categories' }))
      expect(scrollBy).toHaveBeenCalledWith({ left: -1000, behavior: 'smooth' })
    })
  })
})
