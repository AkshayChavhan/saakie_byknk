'use client'

import { useEffect, useState } from 'react'

/**
 * The value, updated only after it has stopped changing for `delayMs`.
 *
 * Search boxes and price inputs used to fire a request on every keystroke;
 * feeding the debounced value into the fetch dependency list instead means
 * one request per pause in typing.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
