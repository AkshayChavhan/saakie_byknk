import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BestDealBanner } from '@/components/home/best-deal-banner'

const deal = {
  name: 'Floral Handwork Saree',
  slug: 'floral',
  price: 2350,
  comparePrice: 2975,
  discount: 21,
  image: 'https://example.com/floral.jpg',
  category: 'Chiffon',
  saleCount: 4,
}

describe('BestDealBanner', () => {
  it('renders nothing when nothing is on sale', () => {
    expect(render(<BestDealBanner deal={null} />).container).toBeEmptyDOMElement()
  })

  it('leads with the discount, then the saree, its prices and photo', () => {
    const { container } = render(<BestDealBanner deal={deal} />)

    expect(screen.getByRole('heading', { name: '21% OFF' })).toBeInTheDocument()
    expect(screen.getByText('Floral Handwork Saree')).toBeInTheDocument()
    expect(screen.getByText('Rs. 2,350')).toBeInTheDocument()
    expect(screen.getByText('Rs. 2,975')).toHaveClass('line-through')
    expect(container.querySelector('img')).toBeInTheDocument()
  })

  it('links to the saree and to everything on sale', () => {
    render(<BestDealBanner deal={deal} />)

    expect(screen.getByRole('link', { name: /Shop this deal/ })).toHaveAttribute('href', '/products/floral')
    expect(screen.getByRole('link', { name: 'See all 4 sarees on sale' })).toHaveAttribute('href', '/products?sale=true')
  })

  it('drops the "see all" link when this is the only sale', () => {
    render(<BestDealBanner deal={{ ...deal, saleCount: 1 }} />)
    expect(screen.queryByRole('link', { name: /See all/ })).not.toBeInTheDocument()
  })
})
