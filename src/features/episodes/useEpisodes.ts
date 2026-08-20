import { useQuery } from '@tanstack/react-query'
import { fetchEpisodes } from '../../shared/api/client'
import type { EpisodeFilters } from '../../shared/api/types'

export function useEpisodes(filters: EpisodeFilters) {
  return useQuery({
    queryKey: ['episodes', filters],
    queryFn: () => fetchEpisodes(filters),
    placeholderData: (previous) => previous,
    staleTime: 5 * 60 * 1000,
  })
}
