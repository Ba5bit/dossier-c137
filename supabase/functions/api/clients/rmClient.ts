import { UpstreamError } from '../lib/errors.ts'
import type { CharacterQuery } from '../types.ts'

const BASE_URL = 'https://rickandmortyapi.com/api'

export type RawCharacter = {
  id: number
  name: string
  status: string
  species: string
  type: string
  gender: string
  image: string
  origin: { name: string; url: string }
  location: { name: string; url: string }
  episode: string[]
}

export type RmListResponse<T> = {
  info: { count: number; pages: number }
  results: T[]
}

export type FetchFn = (url: string) => Promise<Response>

const EMPTY: RmListResponse<never> = {
  info: { count: 0, pages: 0 },
  results: [],
}

function buildQuery(query: CharacterQuery): string {
  const params = new URLSearchParams()
  params.set('page', String(query.page))
  if (query.name) params.set('name', query.name)
  if (query.status) params.set('status', query.status)
  if (query.species) params.set('species', query.species)
  if (query.gender) params.set('gender', query.gender)
  return params.toString()
}

export function createRmClient(fetchFn: FetchFn = fetch) {
  async function get<T>(path: string): Promise<RmListResponse<T>> {
    let response: Response
    try {
      response = await fetchFn(`${BASE_URL}${path}`)
    } catch (cause) {
      throw new UpstreamError(
        `Rick and Morty API unreachable: ${(cause as Error).message}`,
      )
    }

    // The upstream API answers 404 for an empty result set, which is a
    // normal outcome for a filter that matches nothing, not a failure.
    if (response.status === 404) {
      return EMPTY as RmListResponse<T>
    }

    if (!response.ok) {
      throw new UpstreamError(
        `Rick and Morty API returned ${response.status}`,
      )
    }

    return await response.json() as RmListResponse<T>
  }

  return {
    listCharacters(query: CharacterQuery) {
      return get<RawCharacter>(`/character?${buildQuery(query)}`)
    },
  }
}

export type RmClient = ReturnType<typeof createRmClient>
