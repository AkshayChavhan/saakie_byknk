import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HeroSection, type HeroSlide } from '@/components/home/hero-section'

const slide = (n: number, extra: Partial<HeroSlide> = {}): HeroSlide => ({
  id: `s${n}`,
  type: 'default',
  title: `Slide ${n}`,
  subtitle: 'Sub',
  description: 'Desc',
  image: `https://example.com/${n}.jpg`,
  link: '/products',
  cta: 'Shop Now',
  badge: null,
  discount: null,
  product: null,
  ...extra,
})

describe('HeroSection component', () => {
  it('renders the first slide from props with no loading state', () => {
    render(<HeroSection slides={[slide(1), slide(2), slide(3)]} />)
    expect(screen.getByText('Slide 1')).toBeInTheDocument()
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  })

  it('mounts images only for the visible slide and the next one', () => {
    const { container } = render(<HeroSection slides={[slide(1), slide(2), slide(3), slide(4)]} />)

    const srcs = Array.from(container.querySelectorAll('img')).map((img) => img.getAttribute('src'))
    expect(srcs).toEqual(['https://example.com/1.jpg', 'https://example.com/2.jpg'])
  })

  it('brings in the following image as the carousel advances', () => {
    const { container } = render(<HeroSection slides={[slide(1), slide(2), slide(3)]} />)

    fireEvent.click(screen.getByLabelText('Next slide'))

    const srcs = Array.from(container.querySelectorAll('img')).map((img) => img.getAttribute('src'))
    expect(srcs).toEqual(['https://example.com/2.jpg', 'https://example.com/3.jpg'])
  })

  it('falls back to a default slide when given none', () => {
    render(<HeroSection slides={[]} />)
    expect(screen.getByText('Premium Sarees')).toBeInTheDocument()
  })

  it('shows the badge and discount for a sale slide', () => {
    render(<HeroSection slides={[slide(1, { type: 'sale', badge: '30% OFF', discount: 30 })]} />)
    expect(screen.getByText('30% OFF')).toBeInTheDocument()
    expect(screen.getByText('-30%')).toBeInTheDocument()
  })
})
