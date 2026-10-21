'use client'

import { Fragment, useEffect, useId, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { FolderOpen, Search } from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import { useDebouncedValue } from '@/hooks/use-debounced-value'

interface ProductSuggestion {
  id: string
  name: string
  slug: string
  price: number
  image: string | null
  category: string | null
}

interface CategorySuggestion {
  id: string
  name: string
  slug: string
}

interface Suggestions {
  query: string
  products: ProductSuggestion[]
  categories: CategorySuggestion[]
}

/** One row of the dropdown, in keyboard order. */
type Option =
  | { kind: 'category'; id: string; href: string; category: CategorySuggestion }
  | { kind: 'product'; id: string; href: string; product: ProductSuggestion }
  | { kind: 'all'; id: string; href: string }

/** Wait this long after a keystroke before asking the server. */
export const SUGGEST_DEBOUNCE_MS = 150

const searchHref = (query: string) => `/products?search=${encodeURIComponent(query)}`

/** `text` with every case-insensitive occurrence of `query` in bold. */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const lower = text.toLowerCase()
  const q = query.toLowerCase()
  const parts: Array<{ text: string; hit: boolean }> = []
  let from = 0
  for (let at = lower.indexOf(q); at !== -1; at = lower.indexOf(q, from)) {
    if (at > from) parts.push({ text: text.slice(from, at), hit: false })
    parts.push({ text: text.slice(at, at + q.length), hit: true })
    from = at + q.length
  }
  if (from < text.length) parts.push({ text: text.slice(from), hit: false })
  return (
    <>
      {parts.map((part, i) =>
        part.hit ? (
          <mark key={i} className="bg-transparent font-semibold text-gray-900">
            {part.text}
          </mark>
        ) : (
          <Fragment key={i}>{part.text}</Fragment>
        )
      )}
    </>
  )
}

interface SearchSuggestProps {
  /** Called after the shopper picks a suggestion or submits, so the header can close the panel. */
  onNavigate?: () => void
  placeholder?: string
  autoFocus?: boolean
}

/**
 * Header search with live suggestions. Each letter typed refreshes a
 * dropdown of matching categories and sarees (debounced, one request per
 * pause, the previous answer kept on screen meanwhile). Arrow keys move
 * through the rows, Enter opens the highlighted one or searches the full
 * catalogue, Escape closes the dropdown.
 */
export function SearchSuggest({
  onNavigate,
  placeholder = 'Search for sarees, fabrics, categories...',
  autoFocus = false,
}: SearchSuggestProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Suggestions | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const trimmed = query.trim()
  const debounced = useDebouncedValue(trimmed, SUGGEST_DEBOUNCE_MS)

  useEffect(() => {
    if (!debounced) {
      setResults(null)
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    fetchApi(`/api/search/suggest?q=${encodeURIComponent(debounced)}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: Suggestions | null) => {
        if (!controller.signal.aborted && data) setResults(data)
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') console.error('Search suggestions failed:', error)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [debounced])

  // Close when the shopper clicks anywhere outside the box and dropdown.
  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  const options = useMemo<Option[]>(() => {
    if (!trimmed || !results) return []
    return [
      ...results.categories.map((category) => ({
        kind: 'category' as const,
        id: `c-${category.id}`,
        href: `/categories/${category.slug}`,
        category,
      })),
      ...results.products.map((product) => ({
        kind: 'product' as const,
        id: `p-${product.id}`,
        href: `/products/${product.slug}`,
        product,
      })),
      { kind: 'all' as const, id: 'all', href: searchHref(trimmed) },
    ]
  }, [results, trimmed])

  // A fresh answer resets the keyboard highlight.
  useEffect(() => setActive(-1), [results])

  const showDropdown = open && trimmed.length > 0 && (options.length > 0 || loading)
  const noMatches = !!results && results.products.length === 0 && results.categories.length === 0

  const finish = (href: string) => {
    setOpen(false)
    setQuery('')
    setResults(null)
    router.push(href)
    onNavigate?.()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && options.length > 0) {
      e.preventDefault()
      setOpen(true)
      setActive((i) => (i + 1) % options.length)
    } else if (e.key === 'ArrowUp' && options.length > 0) {
      e.preventDefault()
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1))
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActive(-1)
    }
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (active >= 0 && options[active]) finish(options[active].href)
    else if (trimmed) finish(searchHref(trimmed))
  }

  const optionId = (i: number) => `${listId}-${i}`
  const rowClass = (i: number) =>
    `flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors ${
      i === active ? 'bg-gray-100' : 'hover:bg-gray-50'
    }`

  return (
    <div ref={wrapperRef} className="relative">
      <form onSubmit={onSubmit} role="search" className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          role="combobox"
          aria-label="Search"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls={listId}
          aria-activedescendant={active >= 0 ? optionId(active) : undefined}
          className="w-full px-4 py-2 pr-12 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          aria-label="Search"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-primary"
        >
          {loading ? (
            <span className="block h-5 w-5 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin" aria-hidden="true" />
          ) : (
            <Search size={20} />
          )}
        </button>
      </form>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-gray-200">
          <ul id={listId} role="listbox" aria-label="Search suggestions" className="max-h-[70vh] overflow-y-auto py-1">
            {options.map((option, i) => (
              <li
                key={option.id}
                id={optionId(i)}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
              >
                <Link
                  href={option.href}
                  onClick={(e) => {
                    e.preventDefault()
                    finish(option.href)
                  }}
                  tabIndex={-1}
                  className={
                    option.kind === 'all'
                      ? `${rowClass(i)} border-t border-gray-100 font-medium text-gray-900`
                      : rowClass(i)
                  }
                >
                  {option.kind === 'category' && (
                    <>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-500">
                        <FolderOpen size={18} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">
                          <Highlight text={option.category.name} query={trimmed} />
                        </span>
                        <span className="block text-xs text-gray-500">Category</span>
                      </span>
                    </>
                  )}
                  {option.kind === 'product' && (
                    <>
                      {option.product.image ? (
                        <Image
                          src={option.product.image}
                          alt=""
                          width={40}
                          height={40}
                          className="h-10 w-10 shrink-0 rounded-md bg-gray-100 object-cover"
                        />
                      ) : (
                        <span className="h-10 w-10 shrink-0 rounded-md bg-gray-100" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">
                          <Highlight text={option.product.name} query={trimmed} />
                        </span>
                        {option.product.category && (
                          <span className="block truncate text-xs text-gray-500">{option.product.category}</span>
                        )}
                      </span>
                      <span className="shrink-0 text-sm font-medium text-gray-900">
                        {formatPrice(option.product.price)}
                      </span>
                    </>
                  )}
                  {option.kind === 'all' && (
                    <>
                      <Search size={16} className="shrink-0 text-gray-500" aria-hidden="true" />
                      <span className="truncate">
                        {noMatches ? 'No quick matches. Search all sarees for' : 'See all results for'} &ldquo;{trimmed}&rdquo;
                      </span>
                    </>
                  )}
                </Link>
              </li>
            ))}
            {options.length === 0 && loading && (
              <li className="px-4 py-3 text-sm text-gray-500" role="presentation">
                Searching…
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
