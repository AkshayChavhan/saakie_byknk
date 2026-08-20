import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { PaymentMethods, type PaymentMethodsProps } from '@/components/checkout/payment-methods'

function setup(overrides: Partial<PaymentMethodsProps> = {}) {
  const onSelect = vi.fn()
  const onUpiIdChange = vi.fn()
  const props: PaymentMethodsProps = {
    selected: 'upi',
    onSelect,
    onlineConfigured: true,
    upiId: '',
    onUpiIdChange,
    ...overrides,
  }
  render(<PaymentMethods {...props} />)
  return { onSelect, onUpiIdChange }
}

/** The radio input for a given option label. */
function radioFor(label: string): HTMLInputElement {
  return screen.getByRole('radio', { name: new RegExp(label, 'i') }) as HTMLInputElement
}

describe('PaymentMethods', () => {
  it('lists the four prepaid channels with UPI first, and no COD', () => {
    setup()
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(4)
    expect(screen.getByText('UPI')).toBeInTheDocument()
    expect(screen.getByText('Credit / Debit Card')).toBeInTheDocument()
    expect(screen.getByText('Net Banking')).toBeInTheDocument()
    expect(screen.getByText('Wallets')).toBeInTheDocument()
    expect(screen.queryByText('Cash on Delivery')).not.toBeInTheDocument()
  })

  it('shows the UPI app brands shoppers look for', () => {
    setup()
    expect(screen.getByText('Google Pay')).toBeInTheDocument()
    expect(screen.getByText('PhonePe')).toBeInTheDocument()
  })

  it('checks the selected channel only', () => {
    setup({ selected: 'netbanking' })
    expect(radioFor('Net Banking').checked).toBe(true)
    expect(radioFor('UPI').checked).toBe(false)
  })

  it('reports the picked channel', () => {
    const { onSelect } = setup({ selected: 'upi' })
    fireEvent.click(radioFor('Credit / Debit Card'))
    expect(onSelect).toHaveBeenCalledWith('card')
  })

  it('expands only the selected option', () => {
    setup({ selected: 'card' })
    expect(
      screen.getByText(/Card details are entered on the secure Razorpay window/i)
    ).toBeInTheDocument()
    expect(screen.queryByText(/Approve the payment in your UPI app/i)).not.toBeInTheDocument()
  })

  it('explains a missing gateway key rather than offering a dead option', () => {
    setup({ onlineConfigured: false })
    const upiRow = radioFor('UPI').closest('label') as HTMLElement
    expect(radioFor('UPI').disabled).toBe(true)
    expect(within(upiRow).getByText(/Online payment is temporarily unavailable/i)).toBeInTheDocument()
  })

  it('disables every channel when the gateway key is missing', () => {
    setup({ onlineConfigured: false })
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toBeDisabled()
    }
  })

  it('offers an optional UPI ID field when UPI is selected', () => {
    const { onUpiIdChange } = setup({ selected: 'upi' })
    const input = screen.getByLabelText(/UPI ID/i)
    fireEvent.change(input, { target: { value: 'akshay@ybl' } })
    expect(onUpiIdChange).toHaveBeenCalledWith('akshay@ybl')
  })

  it('hides the UPI ID field for other channels', () => {
    setup({ selected: 'wallet' })
    expect(screen.queryByLabelText(/UPI ID/i)).not.toBeInTheDocument()
  })

  it('warns on a malformed UPI ID without blocking checkout', () => {
    setup({ selected: 'upi', upiId: 'not-a-vpa' })
    const input = screen.getByLabelText(/UPI ID/i)
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText(/you can still continue/i)).toBeInTheDocument()
  })

  it('accepts a well-formed UPI ID quietly', () => {
    setup({ selected: 'upi', upiId: 'akshay@okhdfcbank' })
    expect(screen.getByLabelText(/UPI ID/i)).toHaveAttribute('aria-invalid', 'false')
    expect(screen.getByText(/Leave blank to choose your UPI app/i)).toBeInTheDocument()
  })

  it('locks every control while an order is being placed', () => {
    setup({ busy: true })
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toBeDisabled()
    }
    expect(screen.getByLabelText(/UPI ID/i)).toBeDisabled()
  })
})
