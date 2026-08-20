import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

export type UrlFilters<K extends string> = { page: number } & {
  [P in K]?: string
}

export type FilterSetter<K extends string> = (
  key: K | 'page',
  value: string | undefined,
) => void

/**
 * Reads and writes a declared set of filter keys in the query string.
 *
 * Pass a module-level constant as `keys`. A fresh array on every render would
 * change the memo identity each time and defeat the memoization.
 */
export function useUrlFilters<K extends string>(keys: readonly K[]) {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo<UrlFilters<K>>(() => {
    const rawPage = searchParams.get('page')
    const result = { page: rawPage ? Number(rawPage) : 1 } as UrlFilters<K>

    for (const key of keys) {
      result[key] = (searchParams.get(key) ?? undefined) as UrlFilters<K>[K]
    }

    return result
  }, [searchParams, keys])

  const setFilter = useCallback<FilterSetter<K>>(
    (key, value) => {
      const next = new URLSearchParams(searchParams)

      if (value === undefined || value === '') {
        next.delete(key)
      } else {
        next.set(key, value)
      }

      // Changing what is being filtered invalidates the current page —
      // page 5 of the old result set is meaningless in the new one.
      if (key !== 'page') next.delete('page')

      setSearchParams(next)
    },
    [searchParams, setSearchParams],
  )

  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams())
  }, [setSearchParams])

  return { filters, setFilter, clearFilters }
}
