import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { PaymentMethods, type PaymentMethodsProps } from '@/components/checkout/payment-methods'

function setup(overrides: Partial<PaymentMethodsProps> = {}) {
  const onSelect = vi.fn()
  const onUpiIdChange = vi.fn()
  const props: PaymentMethodsProps = {
    selected: 'upi',
    onSelect,
    allowCod: true,
    allowOnline: true,
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
  it('lists every channel with UPI first and COD last', () => {
    setup()
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(5)
    expect(screen.getByText('UPI')).toBeInTheDocument()
    expect(screen.getByText('Credit / Debit Card')).toBeInTheDocument()
    expect(screen.getByText('Net Banking')).toBeInTheDocument()
    expect(screen.getByText('Wallets')).toBeInTheDocument()
    expect(screen.getByText('Cash on Delivery')).toBeInTheDocument()
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
    const { onSelect } = setup({ selected: 'cod' })
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

  it('disables prepaid channels for a COD-only cart and explains why', () => {
    setup({ selected: 'cod', allowOnline: false })
    expect(radioFor('UPI').disabled).toBe(true)
    expect(radioFor('Cash on Delivery').disabled).toBe(false)
    const upiRow = radioFor('UPI').closest('label') as HTMLElement
    expect(within(upiRow).getByText(/Not available for one or more items/i)).toBeInTheDocument()
  })

  it('disables COD for a prepaid-only cart', () => {
    setup({ allowCod: false })
    expect(radioFor('Cash on Delivery').disabled).toBe(true)
    expect(radioFor('UPI').disabled).toBe(false)
  })

  it('explains a missing gateway key rather than offering a dead option', () => {
    setup({ selected: 'cod', onlineConfigured: false })
    const upiRow = radioFor('UPI').closest('label') as HTMLElement
    expect(radioFor('UPI').disabled).toBe(true)
    expect(within(upiRow).getByText(/Online payment is temporarily unavailable/i)).toBeInTheDocument()
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

  it('disables COD when the admin has switched it off store-wide', () => {
    setup({ selected: 'upi', codEnabled: false })
    expect(radioFor('Cash on Delivery').disabled).toBe(true)
    expect(radioFor('UPI').disabled).toBe(false)
  })

  it('blames the store, not the cart, when COD is switched off', () => {
    setup({ selected: 'upi', codEnabled: false })
    const codRow = radioFor('Cash on Delivery').closest('label') as HTMLElement
    expect(within(codRow).getByText(/Cash on Delivery is currently unavailable/i)).toBeInTheDocument()
    expect(within(codRow).queryByText(/one or more items/i)).not.toBeInTheDocument()
  })

  it('still blames the cart when the store allows COD but an item does not', () => {
    setup({ selected: 'upi', allowCod: false, codEnabled: true })
    const codRow = radioFor('Cash on Delivery').closest('label') as HTMLElement
    expect(within(codRow).getByText(/one or more items/i)).toBeInTheDocument()
  })

  it('treats an omitted codEnabled as on', () => {
    setup({ selected: 'upi' })
    expect(radioFor('Cash on Delivery').disabled).toBe(false)
  })

  it('locks every control while an order is being placed', () => {
    setup({ busy: true })
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toBeDisabled()
    }
    expect(screen.getByLabelText(/UPI ID/i)).toBeDisabled()
  })
})
