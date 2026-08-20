import { NotFoundError, UpstreamError } from '../lib/errors.ts'
import type { CharacterQuery, EpisodeQuery, LocationQuery } from '../types.ts'

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

export type RawLocation = {
  id: number
  name: string
  type: string
  dimension: string
  residents: string[]
}

export type RawEpisode = {
  id: number
  name: string
  air_date: string
  episode: string
  characters: string[]
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

function buildQuery(query: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  return params.toString()
}

export function createRmClient(fetchFn: FetchFn = fetch) {
  async function request(path: string): Promise<Response> {
    try {
      return await fetchFn(`${BASE_URL}${path}`)
    } catch (cause) {
      throw new UpstreamError(
        `Rick and Morty API unreachable: ${(cause as Error).message}`,
      )
    }
  }

  async function getList<T>(path: string): Promise<RmListResponse<T>> {
    const response = await request(path)

    // The upstream API answers 404 for an empty result set, which is a
    // normal outcome for a filter that matches nothing, not a failure.
    if (response.status === 404) {
      return EMPTY as RmListResponse<T>
    }

    if (!response.ok) {
      throw new UpstreamError(`Rick and Morty API returned ${response.status}`)
    }

    return await response.json() as RmListResponse<T>
  }

  async function getOne<T>(path: string): Promise<T> {
    const response = await request(path)

    // Here a 404 is a genuine miss rather than an empty result set, and the
    // browser has to see it as one.
    if (response.status === 404) {
      throw new NotFoundError(`No record at ${path}`)
    }

    if (!response.ok) {
      throw new UpstreamError(`Rick and Morty API returned ${response.status}`)
    }

    return await response.json() as T
  }

  async function getMany<T>(path: string, ids: number[]): Promise<T[]> {
    if (ids.length === 0) return []

    // The batch endpoint answers with a bare object when exactly one id is
    // requested and with an array otherwise.
    const body = await getOne<T | T[]>(`${path}/${ids.join(',')}`)
    return Array.isArray(body) ? body : [body]
  }

  return {
    listCharacters(query: CharacterQuery) {
      const search = buildQuery({
        page: query.page,
        name: query.name,
        status: query.status,
        species: query.species,
        gender: query.gender,
      })
      return getList<RawCharacter>(`/character?${search}`)
    },

    getCharacter(id: number) {
      return getOne<RawCharacter>(`/character/${id}`)
    },

    getCharactersByIds(ids: number[]) {
      return getMany<RawCharacter>('/character', ids)
    },

    listLocations(query: LocationQuery) {
      const search = buildQuery({
        page: query.page,
        name: query.name,
        type: query.type,
        dimension: query.dimension,
      })
      return getList<RawLocation>(`/location?${search}`)
    },

    getLocation(id: number) {
      return getOne<RawLocation>(`/location/${id}`)
    },

    listEpisodes(query: EpisodeQuery) {
      const search = buildQuery({
        page: query.page,
        name: query.name,
        episode: query.episode,
      })
      return getList<RawEpisode>(`/episode?${search}`)
    },

    getEpisode(id: number) {
      return getOne<RawEpisode>(`/episode/${id}`)
    },

    getEpisodesByIds(ids: number[]) {
      return getMany<RawEpisode>('/episode', ids)
    },
  }
}

export type RmClient = ReturnType<typeof createRmClient>
