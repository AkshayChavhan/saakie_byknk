import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InstagramCta, INSTAGRAM_PROFILE_URL } from '@/components/layout/instagram-cta'

describe('InstagramCta', () => {
  it('invites visitors to follow and links the button to the profile in a new tab', () => {
    render(<InstagramCta />)

    expect(screen.getByRole('heading', { name: 'Follow us on Instagram' })).toBeInTheDocument()
    const button = screen.getByRole('link', { name: /Follow @saakie_byknk/ })
    expect(button).toHaveAttribute('href', INSTAGRAM_PROFILE_URL)
    expect(button).toHaveAttribute('target', '_blank')
    expect(button).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
