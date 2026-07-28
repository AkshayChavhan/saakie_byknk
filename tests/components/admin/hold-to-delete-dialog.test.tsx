import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import {
  HoldToDeleteDialog,
  HOLD_DURATION_MS,
} from '@/components/admin/hold-to-delete-dialog'

const onConfirm = vi.fn()
const onCancel = vi.fn()

const renderDialog = (props: Partial<Parameters<typeof HoldToDeleteDialog>[0]> = {}) =>
  render(
    <HoldToDeleteDialog
      open
      itemName="Ahilya"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />
  )

const continueButton = () => screen.getByRole('button', { name: /continue|keep holding|deleting/i })

/** Advance fake timers inside act so React flushes the resulting state. */
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms))

describe('HoldToDeleteDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing when closed', () => {
    const { container } = renderDialog({ open: false })

    expect(container).toBeEmptyDOMElement()
  })

  it('names the product being deleted', () => {
    renderDialog()

    expect(screen.getByRole('heading')).toHaveTextContent('Delete “Ahilya”?')
  })

  it('does not delete on a plain click', () => {
    renderDialog()

    fireEvent.click(continueButton())

    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('does not delete before the full hold has elapsed', () => {
    renderDialog()

    fireEvent.pointerDown(continueButton())
    advance(HOLD_DURATION_MS - 1)

    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('deletes once the button has been held for the full duration', () => {
    renderDialog()

    fireEvent.pointerDown(continueButton())
    advance(HOLD_DURATION_MS)

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('cancels the hold when released early', () => {
    renderDialog()

    fireEvent.pointerDown(continueButton())
    advance(HOLD_DURATION_MS - 500)
    fireEvent.pointerUp(continueButton())
    advance(HOLD_DURATION_MS)

    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('cancels the hold when the pointer leaves the button', () => {
    renderDialog()

    fireEvent.pointerDown(continueButton())
    advance(1000)
    fireEvent.pointerLeave(continueButton())
    advance(HOLD_DURATION_MS)

    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('restarts the countdown after an aborted hold', () => {
    renderDialog()

    fireEvent.pointerDown(continueButton())
    advance(HOLD_DURATION_MS - 200)
    fireEvent.pointerUp(continueButton())

    // Second attempt must run the full three seconds, not the leftover 200ms.
    fireEvent.pointerDown(continueButton())
    advance(HOLD_DURATION_MS - 1)
    expect(onConfirm).not.toHaveBeenCalled()

    advance(1)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('confirms only once even if the hold is left running', () => {
    renderDialog()

    fireEvent.pointerDown(continueButton())
    advance(HOLD_DURATION_MS * 3)

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('supports holding the key down for keyboard users', () => {
    renderDialog()

    fireEvent.keyDown(continueButton(), { key: ' ' })
    advance(HOLD_DURATION_MS)

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('ignores auto-repeat so a held key cannot stack timers', () => {
    renderDialog()

    fireEvent.keyDown(continueButton(), { key: ' ' })
    fireEvent.keyDown(continueButton(), { key: ' ', repeat: true })
    fireEvent.keyDown(continueButton(), { key: ' ', repeat: true })
    advance(HOLD_DURATION_MS)

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('cancels the hold when the key is released early', () => {
    renderDialog()

    fireEvent.keyDown(continueButton(), { key: ' ' })
    advance(500)
    fireEvent.keyUp(continueButton(), { key: ' ' })
    advance(HOLD_DURATION_MS)

    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('abandons an in-progress hold if the dialog closes', () => {
    const { rerender } = renderDialog()

    fireEvent.pointerDown(continueButton())
    advance(1000)

    rerender(
      <HoldToDeleteDialog
        open={false}
        itemName="Ahilya"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
    advance(HOLD_DURATION_MS)

    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('cancels on Escape', () => {
    renderDialog()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('cancels when the backdrop is clicked', () => {
    renderDialog()

    fireEvent.click(screen.getByRole('dialog').firstChild as HTMLElement)

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('cannot start a new hold while a delete is in flight', () => {
    renderDialog({ busy: true })

    fireEvent.pointerDown(continueButton())
    advance(HOLD_DURATION_MS)

    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('shows progress only while held', () => {
    renderDialog()
    const progress = screen.getByTestId('hold-progress')

    expect(progress).toHaveStyle({ width: '0%' })

    fireEvent.pointerDown(continueButton())
    expect(progress).toHaveStyle({ width: '100%' })

    fireEvent.pointerUp(continueButton())
    expect(progress).toHaveStyle({ width: '0%' })
  })

  it('focuses Cancel rather than the destructive button', () => {
    renderDialog()

    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })
})
