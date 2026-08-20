import { useQuery } from '@tanstack/react-query'
import { fetchStats } from '../../shared/api/client'

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
    // The backend caches this for a day; asking again within the hour is
    // pure noise.
    staleTime: 60 * 60 * 1000,
  })
}
