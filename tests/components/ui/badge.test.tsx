import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from '@/components/ui/badge'

describe('Badge component', () => {
  it('renders children correctly', () => {
    render(<Badge>Test Badge</Badge>)
    expect(screen.getByText('Test Badge')).toBeInTheDocument()
  })

  it('applies default variant styles', () => {
    render(<Badge>Default</Badge>)
    const badge = screen.getByText('Default')
    expect(badge).toHaveClass('bg-blue-100', 'text-blue-800')
  })

  it('applies destructive variant styles', () => {
    render(<Badge variant="destructive">Destructive</Badge>)
    const badge = screen.getByText('Destructive')
    expect(badge).toHaveClass('bg-red-100', 'text-red-800')
  })

  it('applies custom className', () => {
    render(<Badge className="custom-class">Custom</Badge>)
    const badge = screen.getByText('Custom')
    expect(badge).toHaveClass('custom-class')
  })

  it('renders as a span element', () => {
    render(<Badge>Span Badge</Badge>)
    const badge = screen.getByText('Span Badge')
    expect(badge.tagName).toBe('SPAN')
  })

  it('applies base styling classes', () => {
    render(<Badge>Styled</Badge>)
    const badge = screen.getByText('Styled')
    expect(badge).toHaveClass('inline-flex', 'items-center', 'rounded-full', 'text-xs', 'font-medium')
  })

  it('renders with complex children', () => {
    render(
      <Badge>
        <span data-testid="inner">Inner content</span>
      </Badge>
    )
    expect(screen.getByTestId('inner')).toBeInTheDocument()
    expect(screen.getByText('Inner content')).toBeInTheDocument()
  })

  it('merges custom className with default classes', () => {
    render(<Badge className="px-4">Merged</Badge>)
    const badge = screen.getByText('Merged')
    // Should have px-4 instead of default px-2.5 due to tailwind-merge
    expect(badge).toHaveClass('px-4')
  })

  it('handles empty children', () => {
    const { container } = render(<Badge>{''}</Badge>)
    expect(container.querySelector('span')).toBeInTheDocument()
  })

  it('handles numeric children', () => {
    render(<Badge>{42}</Badge>)
    expect(screen.getByText('42')).toBeInTheDocument()
  })
})
