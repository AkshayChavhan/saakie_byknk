import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PrebookCapsule } from '@/components/products/prebook-capsule'
import { PREBOOK_DELIVERY_WINDOW } from '@/lib/prebook'

describe('PrebookCapsule', () => {
  it('invites the shopper to pre-book and names the delivery window on hover', () => {
    render(<PrebookCapsule />)

    const capsule = screen.getByText('Pre-book now')
    expect(capsule).toHaveAttribute('title', expect.stringContaining(PREBOOK_DELIVERY_WINDOW))
  })

  it('uses a smaller size for the list-view thumbnail', () => {
    const { rerender } = render(<PrebookCapsule />)
    expect(screen.getByText('Pre-book now').className).toContain('text-sm')

    rerender(<PrebookCapsule size="sm" />)
    expect(screen.getByText('Pre-book now').className).toContain('text-xs')
  })
})
