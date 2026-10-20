import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RatingBadge } from '@/components/ui/rating-badge'

describe('RatingBadge', () => {
  it('renders nothing until the product has at least one review', () => {
    expect(render(<RatingBadge rating={0} reviews={0} />).container).toBeEmptyDOMElement()
  })

  it('renders nothing for a stale rating with no reviews behind it', () => {
    expect(render(<RatingBadge rating={4.5} reviews={0} />).container).toBeEmptyDOMElement()
  })

  it('shows the score and count once there is a review', () => {
    render(<RatingBadge rating={4} reviews={1} />)
    expect(screen.getByLabelText('Rated 4.0 out of 5 from 1 review')).toBeInTheDocument()
  })
})
