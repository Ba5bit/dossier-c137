import { useQuery } from '@tanstack/react-query'
import { fetchSearch } from '../../shared/api/client'

/** Below this the request is noise: every character matches something. */
export const SEARCH_MIN = 2

export function useSearch(query: string) {
  const trimmed = query.trim()

  return useQuery({
    // Case is irrelevant upstream, so it must be irrelevant to the key too.
    queryKey: ['search', trimmed.toLowerCase()],
    queryFn: () => fetchSearch(trimmed),
    enabled: trimmed.length >= SEARCH_MIN,
    staleTime: 5 * 60 * 1000,
    // Keep the previous groups on screen while the next ones arrive; the
    // list flickering under the cursor is worse than one stale row.
    placeholderData: (previous) => previous,
  })
}
