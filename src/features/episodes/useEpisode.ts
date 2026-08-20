import { useQuery } from '@tanstack/react-query'
import { ApiError, fetchEpisode } from '../../shared/api/client'

export function useEpisode(id: number) {
  return useQuery({
    queryKey: ['episode', id],
    queryFn: () => fetchEpisode(id),
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.code === 'NOT_FOUND') &&
      failureCount < 2,
    staleTime: 5 * 60 * 1000,
  })
}
