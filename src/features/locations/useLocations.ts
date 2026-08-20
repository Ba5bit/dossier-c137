import { useQuery } from '@tanstack/react-query'
import { fetchLocations } from '../../shared/api/client'
import type { LocationFilters } from '../../shared/api/types'

export function useLocations(filters: LocationFilters) {
  return useQuery({
    queryKey: ['locations', filters],
    queryFn: () => fetchLocations(filters),
    placeholderData: (previous) => previous,
    staleTime: 5 * 60 * 1000,
  })
}
