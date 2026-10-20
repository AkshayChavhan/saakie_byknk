import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CategoryShelves, shelfTitle } from '@/components/home/category-shelves'

const product = (id: string, name: string) => ({
  id,
  slug: id,
  name,
  price: 4999,
  comparePrice: null,
  rating: 0,
  reviews: 0,
  image: `https://example.com/${id}.jpg`,
  colors: [],
})

const shelves = [
  { id: 'c1', name: 'Pure Silk', slug: 'pure-silk', products: [product('p1', 'Kanjivaram')] },
  { id: 'c2', name: 'Designer Sarees', slug: 'designer-sarees', products: [product('p2', 'Zari Border')] },
]

describe('CategoryShelves component', () => {
  it('renders one rule-headed shelf per category, in order', () => {
    render(<CategoryShelves shelves={shelves} />)

    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(headings).toEqual(['Pure Silk Sarees', 'Designer Sarees'])
    expect(screen.getByText('Kanjivaram')).toBeInTheDocument()
    expect(screen.getByText('Zari Border')).toBeInTheDocument()
  })

  it('sets each heading in spaced capitals between rules', () => {
    render(<CategoryShelves shelves={shelves} />)
    const heading = screen.getByRole('heading', { name: 'Pure Silk Sarees' })
    expect(heading.className).toContain('uppercase')
    expect(heading.className).toMatch(/tracking-\[/)
    // A short rule before the title and a long one after it.
    const rules = heading.parentElement!.querySelectorAll('span[aria-hidden="true"]')
    expect(rules).toHaveLength(2)
    expect(rules[1].className).toContain('flex-1')
  })

  it('links each shelf to its category page', () => {
    render(<CategoryShelves shelves={shelves} />)
    expect(screen.getByRole('link', { name: /View all Pure Silk/ })).toHaveAttribute('href', '/categories/pure-silk')
  })

  it('renders nothing when there are no shelves', () => {
    const { container } = render(<CategoryShelves shelves={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('shelfTitle', () => {
  it('appends "Sarees" unless the name already says so', () => {
    expect(shelfTitle('Pure Silk')).toBe('Pure Silk Sarees')
    expect(shelfTitle('Designer Sarees')).toBe('Designer Sarees')
    expect(shelfTitle('Banarasi saree')).toBe('Banarasi saree')
  })
})
