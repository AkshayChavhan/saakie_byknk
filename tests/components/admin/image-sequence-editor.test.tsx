import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { ImageSequenceEditor, type SequenceItem } from '@/components/admin/image-sequence-editor'

const items: SequenceItem[] = [
  { key: 'a', url: 'https://example.com/a.jpg' },
  { key: 'b', url: 'https://example.com/b.jpg' },
  { key: 'c', url: 'https://example.com/c.jpg', isNew: true },
]

const tiles = () => screen.getAllByRole('listitem')

describe('ImageSequenceEditor', () => {
  it('numbers the photos in order and marks the first as the main image', () => {
    render(<ImageSequenceEditor items={items} onMove={() => {}} onRemove={() => {}} />)

    expect(tiles().map((t) => within(t).getAllByText(/^[123]$/)[0].textContent)).toEqual(['1', '2', '3'])
    expect(within(tiles()[0]).getByText('Main')).toBeInTheDocument()
    expect(within(tiles()[2]).getByText('New')).toBeInTheDocument()
  })

  it('moves a photo with the arrow buttons, and disables the ends', () => {
    const onMove = vi.fn()
    render(<ImageSequenceEditor items={items} onMove={onMove} onRemove={() => {}} />)

    fireEvent.click(within(tiles()[1]).getByRole('button', { name: /Move image 2 later/ }))
    expect(onMove).toHaveBeenCalledWith(1, 2)
    fireEvent.click(within(tiles()[1]).getByRole('button', { name: /Move image 2 earlier/ }))
    expect(onMove).toHaveBeenCalledWith(1, 0)

    expect(within(tiles()[0]).getByRole('button', { name: /earlier/ })).toBeDisabled()
    expect(within(tiles()[2]).getByRole('button', { name: /later/ })).toBeDisabled()
  })

  it('reorders by dragging one photo onto another', () => {
    const onMove = vi.fn()
    render(<ImageSequenceEditor items={items} onMove={onMove} onRemove={() => {}} />)

    const dataTransfer = { effectAllowed: '', dropEffect: '', setData: vi.fn() }
    fireEvent.dragStart(tiles()[0], { dataTransfer })
    fireEvent.dragOver(tiles()[2], { dataTransfer })
    fireEvent.drop(tiles()[2], { dataTransfer })

    expect(onMove).toHaveBeenCalledWith(0, 2)
  })

  it('does nothing when a photo is dropped on itself', () => {
    const onMove = vi.fn()
    render(<ImageSequenceEditor items={items} onMove={onMove} onRemove={() => {}} />)

    const dataTransfer = { effectAllowed: '', dropEffect: '', setData: vi.fn() }
    fireEvent.dragStart(tiles()[1], { dataTransfer })
    fireEvent.drop(tiles()[1], { dataTransfer })

    expect(onMove).not.toHaveBeenCalled()
  })

  it('skips removed photos in the numbering and does not let them be dragged', () => {
    const withRemoved: SequenceItem[] = [
      { key: 'a', url: 'https://example.com/a.jpg', removed: true },
      { key: 'b', url: 'https://example.com/b.jpg' },
      { key: 'c', url: 'https://example.com/c.jpg' },
    ]
    render(<ImageSequenceEditor items={withRemoved} onMove={() => {}} onRemove={() => {}} />)

    // b is now photo 1 (the main one), c is photo 2.
    expect(within(tiles()[1]).getByText('Main')).toBeInTheDocument()
    expect(within(tiles()[2]).getByText('2')).toBeInTheDocument()
    expect(tiles()[0]).toHaveAttribute('draggable', 'false')
    expect(tiles()[1]).toHaveAttribute('draggable', 'true')
    expect(within(tiles()[0]).getByRole('button', { name: 'Keep image' })).toBeInTheDocument()
  })

  it('reports which photo to remove', () => {
    const onRemove = vi.fn()
    render(<ImageSequenceEditor items={items} onMove={() => {}} onRemove={onRemove} />)

    fireEvent.click(within(tiles()[2]).getByRole('button', { name: 'Discard this upload' }))
    expect(onRemove).toHaveBeenCalledWith('c')
  })
})
