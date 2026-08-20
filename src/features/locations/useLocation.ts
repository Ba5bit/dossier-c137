import { useQuery } from '@tanstack/react-query'
import { ApiError, fetchLocation } from '../../shared/api/client'

export function useLocation(id: number) {
  return useQuery({
    queryKey: ['location', id],
    queryFn: () => fetchLocation(id),
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.code === 'NOT_FOUND') &&
      failureCount < 2,
    staleTime: 5 * 60 * 1000,
  })
}
