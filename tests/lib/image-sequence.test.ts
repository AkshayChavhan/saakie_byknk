import { describe, it, expect } from 'vitest'
import { moveItem, parseImageOrder, resolveImageOrder } from '@/lib/image-sequence'

const A = 'a'.repeat(24)
const B = 'b'.repeat(24)
const C = 'c'.repeat(24)

describe('moveItem', () => {
  it('moves an item forward and backward without mutating the input', () => {
    const list = ['1', '2', '3', '4']
    expect(moveItem(list, 0, 2)).toEqual(['2', '3', '1', '4'])
    expect(moveItem(list, 3, 0)).toEqual(['4', '1', '2', '3'])
    expect(list).toEqual(['1', '2', '3', '4'])
  })

  it('ignores a move to the same place or out of range', () => {
    expect(moveItem(['1', '2'], 1, 1)).toEqual(['1', '2'])
    expect(moveItem(['1', '2'], 0, 5)).toEqual(['1', '2'])
    expect(moveItem(['1', '2'], -1, 0)).toEqual(['1', '2'])
  })
})

describe('parseImageOrder', () => {
  it('accepts image ids and new:<n> tokens, dropping duplicates', () => {
    expect(parseImageOrder(JSON.stringify([A, 'new:0', B, A]))).toEqual([A, 'new:0', B])
  })

  it('rejects anything that is not a list of valid tokens', () => {
    expect(parseImageOrder(null)).toBeNull()
    expect(parseImageOrder('not json')).toBeNull()
    expect(parseImageOrder('{"a":1}')).toBeNull()
    expect(parseImageOrder(JSON.stringify([A, 'drop table']))).toBeNull()
    expect(parseImageOrder(JSON.stringify([{ id: A }]))).toBeNull()
    expect(parseImageOrder(JSON.stringify(Array(31).fill(A)))).toBeNull()
  })
})

describe('resolveImageOrder', () => {
  it('puts images in the requested order, mapping new:<n> to the created ids', () => {
    expect(
      resolveImageOrder({ order: ['new:1', A, 'new:0', B], keptIds: [A, B], createdIds: ['n0', 'n1'] })
    ).toEqual(['n1', A, 'n0', B])
  })

  it('drops tokens for removed images and for uploads that were never created', () => {
    expect(
      resolveImageOrder({ order: [C, A, 'new:3', 'new:0'], keptIds: [A], createdIds: ['n0'] })
    ).toEqual([A, 'n0'])
  })

  it('appends any surviving image the order forgot, so none vanish from the gallery', () => {
    expect(resolveImageOrder({ order: [B], keptIds: [A, B], createdIds: ['n0'] })).toEqual([B, A, 'n0'])
  })

  it('returns an empty list when there is nothing to order', () => {
    expect(resolveImageOrder({ order: [], keptIds: [], createdIds: [] })).toEqual([])
  })
})
