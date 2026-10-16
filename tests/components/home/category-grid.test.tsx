import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
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

  it('links each card to its category page with the product count', () => {
    render(<CategoryGrid categories={categories} />)

    const link = screen.getByRole('listitem', { name: 'Silk Sarees - 45 products' })
    expect(link).toHaveAttribute('href', '/categories/silk-sarees')
    expect(screen.getByText('45 Products')).toBeInTheDocument()
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
})
