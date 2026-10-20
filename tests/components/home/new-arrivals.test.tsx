import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NewArrivals } from '@/components/home/new-arrivals'

const products = [
  {
    id: 'prod_1',
    slug: 'fresh-saree',
    name: 'Fresh Saree',
    price: 4999,
    comparePrice: null,
    rating: 0,
    reviews: 0,
    image: 'https://example.com/fresh.jpg',
    colors: [],
  },
]

describe('NewArrivals component', () => {
  it('renders nothing at all, not even the heading, when there are no new arrivals', () => {
    const { container } = render(<NewArrivals products={[]} />)
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText('New Arrivals')).not.toBeInTheDocument()
  })

  it('renders the heading and the products without a NEW badge', () => {
    // Everything on this shelf is new; a badge per card would only repeat
    // the section title.
    render(<NewArrivals products={products.map((p) => ({ ...p, isNew: true }))} />)
    expect(screen.getByRole('heading', { name: 'New Arrivals' })).toBeInTheDocument()
    expect(screen.getByText('Fresh Saree')).toBeInTheDocument()
    expect(screen.queryByText('NEW')).not.toBeInTheDocument()
  })

  it('links "view all" to the newest-first catalogue', () => {
    render(<NewArrivals products={products} />)
    expect(screen.getByRole('link', { name: /View All New Arrivals/ })).toHaveAttribute(
      'href',
      '/products?sort=newest'
    )
  })
})
