import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
const api = vi.hoisted(() => ({ fetchApi: vi.fn() }))
vi.mock('@/lib/api', () => ({ fetchApi: api.fetchApi }))

import { SearchSuggest } from '@/components/layout/search-suggest'

const reply = (body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }))

const MEHER = {
  query: 'meh',
  categories: [{ id: 'c1', name: 'Meher Collection', slug: 'meher-collection' }],
  products: [
    { id: 'p1', name: 'Meher', slug: 'meher', price: 2350, image: null, category: 'Chiffon' },
    { id: 'p2', name: 'Royal Meher', slug: 'royal-meher', price: 4100, image: null, category: null },
  ],
}

const type = (text: string) => fireEvent.change(screen.getByRole('combobox'), { target: { value: text } })

/** A row by its visible text. The bolded letters split the text across
 *  elements, so role-name queries see "Meh er"; textContent does not. */
const findOption = (text: string) =>
  waitFor(
    () => {
      const option = screen.queryAllByRole('option').find((o) => o.textContent?.includes(text))
      expect(option).toBeTruthy()
      return option as HTMLElement
    },
    // The dropdown waits out the debounce first; give a busy CI box room.
    { timeout: 3000 }
  )

describe('SearchSuggest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.fetchApi.mockImplementation(() => reply(MEHER))
  })

  it('asks for suggestions as the shopper types and lists them', async () => {
    const onNavigate = vi.fn()
    render(<SearchSuggest onNavigate={onNavigate} />)
    type('meh')

    expect(await findOption('Royal Meher')).toBeInTheDocument()
    expect(api.fetchApi).toHaveBeenCalledWith('/api/search/suggest?q=meh', expect.objectContaining({ signal: expect.anything() }))
    expect(await findOption('Meher Collection')).toBeInTheDocument()
    expect(screen.getByText('Rs. 2,350')).toBeInTheDocument()
    expect(await findOption('See all results for “meh”')).toBeInTheDocument()
  })

  it('bolds the typed letters inside each suggestion', async () => {
    render(<SearchSuggest />)
    type('meh')
    await findOption('Royal Meher')

    const marks = Array.from(document.querySelectorAll('mark')).map((m) => m.textContent)
    expect(marks).toContain('Meh')
  })

  it('waits for a pause in typing before asking', async () => {
    render(<SearchSuggest />)
    type('m')
    type('me')
    type('meh')

    await findOption('Royal Meher')
    expect(api.fetchApi).toHaveBeenCalledTimes(1)
  })

  it('opens the highlighted row with the arrow keys and Enter', async () => {
    const onNavigate = vi.fn()
    render(<SearchSuggest onNavigate={onNavigate} />)
    type('meh')
    await findOption('Royal Meher')

    const box = screen.getByRole('combobox')
    fireEvent.keyDown(box, { key: 'ArrowDown' }) // Meher Collection
    fireEvent.keyDown(box, { key: 'ArrowDown' }) // Meher
    expect(await findOption('MeherChiffon')).toHaveAttribute('aria-selected', 'true')
    fireEvent.submit(box.closest('form')!)

    expect(push).toHaveBeenCalledWith('/products/meher')
    expect(onNavigate).toHaveBeenCalled()
  })

  it('searches the whole catalogue on Enter when no row is highlighted', async () => {
    render(<SearchSuggest />)
    type('meher silk')
    fireEvent.submit(screen.getByRole('combobox').closest('form')!)

    expect(push).toHaveBeenCalledWith('/products?search=meher%20silk')
  })

  it('offers the full search when nothing matches quickly', async () => {
    api.fetchApi.mockImplementation(() => reply({ query: 'zzz', products: [], categories: [] }))
    render(<SearchSuggest />)
    type('zzz')

    expect(await findOption('No quick matches')).toBeInTheDocument()
  })

  it('closes the dropdown on Escape', async () => {
    render(<SearchSuggest />)
    type('meh')
    await findOption('Royal Meher')

    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
  })
})
