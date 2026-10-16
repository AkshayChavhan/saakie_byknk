import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FeaturedProducts } from '@/components/home/featured-products'

/**
 * Prop-driven: the home page loads the products on the server. No fetch, no
 * loading state.
 */
const products = [
  {
    id: 'prod_1',
    slug: 'silk-saree',
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
    slug: 'cotton-saree',
    name: 'Cotton Saree',
    price: 2999,
    comparePrice: null,
    rating: 4.2,
    reviews: 15,
    image: 'https://example.com/cotton.jpg',
    colors: ['#0000FF'],
    isNew: false,
    isBestseller: true,
  },
]

describe('FeaturedProducts component', () => {
  it('renders the products it is given, synchronously', () => {
    render(<FeaturedProducts products={products} />)

    expect(screen.getByText('Silk Saree')).toBeInTheDocument()
    expect(screen.getByText('Cotton Saree')).toBeInTheDocument()
    expect(document.querySelector('.saree-drape-outer')).not.toBeInTheDocument()
  })

  it('renders nothing at all when no products are featured', () => {
    const { container } = render(<FeaturedProducts products={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the discount only for a genuine markdown', () => {
    render(<FeaturedProducts products={products} />)

    expect(screen.getByText('25% OFF')).toBeInTheDocument()
    expect(screen.getAllByText(/% OFF/)).toHaveLength(1)
  })

  it('shows NEW and BESTSELLER badges', () => {
    render(<FeaturedProducts products={products} />)

    expect(screen.getByText('NEW')).toBeInTheDocument()
    expect(screen.getByText('BESTSELLER')).toBeInTheDocument()
  })

  it('links each card to the product page', () => {
    render(<FeaturedProducts products={products} />)
    const links = screen.getAllByRole('link').filter((a) => a.getAttribute('href')?.startsWith('/products/'))
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/products/silk-saree', '/products/cotton-saree'])
  })

  it('toggles the local wishlist heart', () => {
    render(<FeaturedProducts products={products} />)
    const hearts = screen.getAllByRole('button').filter((b) => b.querySelector('svg.lucide-heart'))
    expect(hearts.length).toBeGreaterThan(0)

    fireEvent.click(hearts[0])
    expect(hearts[0].className).toContain('bg-red-500')
    fireEvent.click(hearts[0])
    expect(hearts[0].className).not.toContain('bg-red-500')
  })
})
