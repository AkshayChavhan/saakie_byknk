import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { HeroSection, type HeroSlide, type HeroSlideSets } from '@/components/home/hero-section'

const slide = (n: number, extra: Partial<HeroSlide> = {}): HeroSlide => ({
  id: `s${n}`,
  type: 'default',
  title: `Slide ${n}`,
  subtitle: 'Sub',
  description: 'Desc',
  image: `https://example.com/${n}.jpg`,
  link: '/products',
  cta: 'Shop Now',
  device: null,
  badge: null,
  discount: null,
  product: null,
  ...extra,
})

/** Both screen sets get the same slides unless a test says otherwise. */
const sets = (desktop: HeroSlide[], mobile: HeroSlide[] = desktop): HeroSlideSets => ({
  DESKTOP: desktop,
  MOBILE: mobile,
})

/** jsdom has no matchMedia; fake one that answers the desktop query. */
const fakeMatchMedia = (desktop: boolean) => {
  const listeners: Array<() => void> = []
  const query = {
    matches: desktop,
    addEventListener: (_: string, fn: () => void) => listeners.push(fn),
    removeEventListener: vi.fn(),
  }
  window.matchMedia = vi.fn().mockReturnValue(query) as unknown as typeof window.matchMedia
  return {
    resize: (toDesktop: boolean) => {
      query.matches = toDesktop
      act(() => listeners.forEach((fn) => fn()))
    },
  }
}

describe('HeroSection component', () => {
  afterEach(() => {
    // @ts-expect-error - restore jsdom's absence of matchMedia
    delete window.matchMedia
  })

  it('renders the set the server guessed when the screen cannot be measured', () => {
    render(<HeroSection slides={sets([slide(1)], [slide(2)])} initialDevice="MOBILE" />)
    expect(screen.getByText('Slide 2')).toBeInTheDocument()
    expect(screen.queryByText('Slide 1')).not.toBeInTheDocument()
  })

  it('switches to the set that matches the real screen width, and back on resize', () => {
    const media = fakeMatchMedia(false) // a phone-width window
    render(<HeroSection slides={sets([slide(1)], [slide(2)])} initialDevice="DESKTOP" />)
    expect(screen.getByText('Slide 2')).toBeInTheDocument()
    expect(screen.queryByText('Slide 1')).not.toBeInTheDocument()

    media.resize(true)
    expect(screen.getByText('Slide 1')).toBeInTheDocument()
    expect(screen.queryByText('Slide 2')).not.toBeInTheDocument()
  })

  it('renders the first slide from props with no loading state', () => {
    render(<HeroSection slides={sets([slide(1), slide(2), slide(3)])} initialDevice="DESKTOP" />)
    expect(screen.getByText('Slide 1')).toBeInTheDocument()
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  })

  it('mounts images only for the visible slide and the next one', () => {
    const { container } = render(<HeroSection slides={sets([slide(1), slide(2), slide(3), slide(4)])} initialDevice="DESKTOP" />)

    const srcs = Array.from(container.querySelectorAll('img')).map((img) => img.getAttribute('src'))
    expect(srcs).toEqual(['https://example.com/1.jpg', 'https://example.com/2.jpg'])
  })

  it('brings in the following image as the carousel advances', () => {
    const { container } = render(<HeroSection slides={sets([slide(1), slide(2), slide(3)])} initialDevice="DESKTOP" />)

    fireEvent.click(screen.getByLabelText('Next slide'))

    const srcs = Array.from(container.querySelectorAll('img')).map((img) => img.getAttribute('src'))
    expect(srcs).toEqual(['https://example.com/2.jpg', 'https://example.com/3.jpg'])
  })

  it('falls back to a default slide when given none', () => {
    render(<HeroSection slides={sets([])} initialDevice="DESKTOP" />)
    expect(screen.getByText('Premium Sarees')).toBeInTheDocument()
  })

  it('shows the badge and discount for a sale slide', () => {
    render(<HeroSection slides={sets([slide(1, { type: 'sale', badge: '30% OFF', discount: 30 })])} initialDevice="DESKTOP" />)
    expect(screen.getByText('30% OFF')).toBeInTheDocument()
    expect(screen.getByText('-30%')).toBeInTheDocument()
  })
})
