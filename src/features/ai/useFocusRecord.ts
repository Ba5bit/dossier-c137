import { useQuery } from '@tanstack/react-query'
import { ApiError, fetchCharacter, fetchEpisode, fetchLocation } from '../../shared/api/client'
import type {
  AskFocus,
  CharacterDetail,
  EpisodeDetail,
  LocationDetail,
} from '../../shared/api/types'

type Detail = CharacterDetail | LocationDetail | EpisodeDetail

/**
 * The name of the record the questions are about. "LOCATIONS #7" is a key,
 * not a subject — the visitor came here from a page headed Immortality Field
 * Resort and expects to read that.
 *
 * The key and the fetch are the detail page's own, so arriving from a dossier
 * reads the record straight out of the cache and costs no request. Only the
 * name is selected out of it.
 */
export function useFocusRecord(focus?: AskFocus) {
  return useQuery({
    queryKey: [focus?.type ?? 'focus', focus?.id ?? 0],
    queryFn: async (): Promise<Detail> => {
      if (!focus) throw new Error('no record in focus')
      if (focus.type === 'character') return await fetchCharacter(focus.id)
      if (focus.type === 'location') return await fetchLocation(focus.id)
      return await fetchEpisode(focus.id)
    },
    select: (detail: Detail): string => {
      if ('character' in detail) return detail.character.name
      if ('location' in detail) return detail.location.name
      return detail.episode.name
    },
    enabled: focus !== undefined,
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.code === 'NOT_FOUND') && failureCount < 2,
    staleTime: 5 * 60 * 1000,
  })
}
