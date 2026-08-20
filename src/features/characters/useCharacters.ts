import { useQuery } from '@tanstack/react-query'
import { fetchCharacters } from '../../shared/api/client'
import type { CharacterFilters } from '../../shared/api/types'

export function useCharacters(filters: CharacterFilters) {
  return useQuery({
    // The filter object is the identity of this request, so it is the key.
    queryKey: ['characters', filters],
    queryFn: () => fetchCharacters(filters),
    // Show data enters as skeletons on first load only; subsequent pages
    // keep the previous result visible while the next one arrives.
    placeholderData: (previous) => previous,
    staleTime: 5 * 60 * 1000,
  })
}
