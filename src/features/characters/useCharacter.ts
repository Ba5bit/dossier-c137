import { useQuery } from '@tanstack/react-query'
import { ApiError, fetchCharacter } from '../../shared/api/client'

export function useCharacter(id: number) {
  return useQuery({
    queryKey: ['character', id],
    queryFn: () => fetchCharacter(id),
    // A missing record will still be missing on the third attempt; retrying
    // only delays the 404 page.
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.code === 'NOT_FOUND') &&
      failureCount < 2,
    staleTime: 5 * 60 * 1000,
  })
}
