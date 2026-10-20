import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PrebookButton } from '@/components/products/prebook-button'

const setup = (onConfirm = vi.fn()) => {
  render(<PrebookButton label="Pre-book - Rs. 1,850" onConfirm={onConfirm} />)
  return { onConfirm, trigger: screen.getByRole('button', { name: /Pre-book - Rs. 1,850/ }) }
}

describe('PrebookButton', () => {
  it('starts closed', () => {
    const { trigger } = setup()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens a popover with the pre-booking message on click, without pre-booking yet', () => {
    const { trigger, onConfirm } = setup()
    fireEvent.click(trigger)

    const dialog = screen.getByRole('dialog', { name: 'Your favourite saree is worth the wait!' })
    expect(dialog).toHaveTextContent('15–20 days for delivery from the date your order is placed')
    expect(dialog).toHaveTextContent('Each beautiful drape is worth waiting for')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('pre-books only when the customer confirms', () => {
    const { trigger, onConfirm } = setup()
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('button', { name: 'Pre-book now' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes on Escape, on "Not now" and on a click outside', () => {
    const { trigger, onConfirm } = setup()

    fireEvent.click(trigger)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()

    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(trigger)
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('shows progress and blocks a second click while the pre-booking is placed', () => {
    render(<PrebookButton label="Pre-book" onConfirm={vi.fn()} busy />)
    expect(screen.getByRole('button', { name: /Pre-booking/ })).toBeDisabled()
  })
})
