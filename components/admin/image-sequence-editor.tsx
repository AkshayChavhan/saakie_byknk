'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, GripVertical, X } from 'lucide-react'

export interface SequenceItem {
  /** Stable id for the tile: an image id, or `new:<n>` for a file about to upload. */
  key: string
  url: string
  /** An existing image marked for removal; shown dimmed and skipped in the numbering. */
  removed?: boolean
  /** A file picked in this form and not saved yet. */
  isNew?: boolean
}

interface ImageSequenceEditorProps {
  items: SequenceItem[]
  /** Move the tile at `from` to position `to` (indexes into `items`). */
  onMove: (from: number, to: number) => void
  /** Remove a tile; for an existing image this toggles removal so it can be undone. */
  onRemove: (key: string) => void
}

/**
 * The product form's photo strip. Tiles are numbered in the order customers
 * will see them, and image 1 is the main photo. Drag a tile onto another to
 * reorder; the arrow buttons do the same by tap or keyboard, since touch
 * screens do not drag.
 */
export function ImageSequenceEditor({ items, onMove, onRemove }: ImageSequenceEditorProps) {
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  // Position among the images that will be kept (1-based); removed ones have none.
  let position = 0
  const positions = items.map((item) => (item.removed ? null : ++position))

  const endDrag = () => {
    setDragFrom(null)
    setDragOver(null)
  }

  return (
    <ol className="flex flex-wrap gap-3" aria-label="Product images in display order">
      {items.map((item, index) => {
        const place = positions[index]
        const isMain = place === 1
        const canMoveLeft = !item.removed && index > 0
        const canMoveRight = !item.removed && index < items.length - 1

        return (
          <li
            key={item.key}
            draggable={!item.removed}
            onDragStart={(e) => {
              setDragFrom(index)
              e.dataTransfer.effectAllowed = 'move'
              // Firefox only starts a drag when some data is set.
              e.dataTransfer.setData('text/plain', item.key)
            }}
            onDragOver={(e) => {
              if (dragFrom === null) return
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              if (dragOver !== index) setDragOver(index)
            }}
            onDrop={(e) => {
              e.preventDefault()
              if (dragFrom !== null && dragFrom !== index) onMove(dragFrom, index)
              endDrag()
            }}
            onDragEnd={endDrag}
            className={`relative w-24 select-none ${dragFrom === index ? 'opacity-40' : ''}`}
          >
            <div
              className={`relative h-24 w-24 overflow-hidden rounded-lg ring-2 transition-all ${
                item.removed
                  ? 'opacity-30 ring-red-300'
                  : dragOver === index && dragFrom !== null && dragFrom !== index
                    ? 'ring-black'
                    : isMain
                      ? 'ring-amber-400'
                      : 'ring-gray-200'
              } ${item.removed ? '' : 'cursor-grab active:cursor-grabbing'}`}
            >
              <Image
                src={item.url}
                alt={place ? `Product image ${place}` : 'Product image (will be removed)'}
                width={96}
                height={96}
                draggable={false}
                className="h-full w-full object-cover"
              />
              {place !== null && (
                <span className="absolute left-1 top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-black px-1.5 text-xs font-semibold text-white">
                  {place}
                </span>
              )}
              {!item.removed && (
                <GripVertical
                  className="absolute bottom-1 right-1 h-4 w-4 text-white drop-shadow"
                  aria-hidden="true"
                />
              )}
            </div>

            <button
              type="button"
              onClick={() => onRemove(item.key)}
              className="absolute -right-2 -top-2 rounded-full bg-white p-1 shadow ring-1 ring-gray-200 hover:bg-red-50"
              title={item.removed ? 'Keep image' : item.isNew ? 'Discard this upload' : 'Remove image'}
              aria-label={item.removed ? 'Keep image' : item.isNew ? 'Discard this upload' : 'Remove image'}
            >
              <X className={`h-3.5 w-3.5 ${item.removed ? 'text-gray-400' : 'text-red-600'}`} />
            </button>

            <div className="mt-1.5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => onMove(index, index - 1)}
                disabled={!canMoveLeft}
                className="rounded p-1 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label={place ? `Move image ${place} earlier` : 'Move earlier'}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[11px] font-medium text-gray-500">
                {isMain ? 'Main' : item.isNew ? 'New' : ''}
              </span>
              <button
                type="button"
                onClick={() => onMove(index, index + 1)}
                disabled={!canMoveRight}
                className="rounded p-1 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label={place ? `Move image ${place} later` : 'Move later'}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
