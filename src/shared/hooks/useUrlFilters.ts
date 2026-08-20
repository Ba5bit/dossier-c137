import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { CharacterFilters } from '../api/types'

export type FilterKey = 'page' | 'name' | 'status' | 'species' | 'gender'

export function useUrlFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo<CharacterFilters>(() => {
    const rawPage = searchParams.get('page')
    return {
      page: rawPage ? Number(rawPage) : 1,
      name: searchParams.get('name') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      species: searchParams.get('species') ?? undefined,
      gender: searchParams.get('gender') ?? undefined,
    }
  }, [searchParams])

  const setFilter = useCallback(
    (key: FilterKey, value: string | undefined) => {
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
