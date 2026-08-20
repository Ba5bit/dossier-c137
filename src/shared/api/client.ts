import type {
  Character,
  CharacterDetail,
  CharacterFilters,
  Episode,
  EpisodeDetail,
  EpisodeFilters,
  ListResponse,
  Location,
  LocationDetail,
  LocationFilters,
  Stats,
} from './types'

export class ApiError extends Error {
  // Declared as a field rather than a constructor parameter property:
  // tsconfig runs with erasableSyntaxOnly, which forbids the shorthand.
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

function baseUrl(): string {
  return import.meta.env.VITE_API_BASE ?? '/api'
}

async function get<T>(path: string): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${baseUrl()}${path}`)
  } catch (cause) {
    throw new ApiError('NETWORK', (cause as Error).message)
  }

  const body = await response.json()

  if (!response.ok) {
    const code = body?.error?.code ?? 'UNKNOWN'
    const message = body?.error?.message ?? `Request failed (${response.status})`
    throw new ApiError(code, message)
  }

  return body as T
}

function toQuery(filters: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  return params.toString()
}

export function fetchCharacters(
  filters: CharacterFilters,
): Promise<ListResponse<Character>> {
  const search = toQuery({
    page: filters.page ?? 1,
    name: filters.name,
    status: filters.status,
    species: filters.species,
    gender: filters.gender,
  })
  return get<ListResponse<Character>>(`/characters?${search}`)
}

export function fetchCharacter(id: number): Promise<CharacterDetail> {
  return get<CharacterDetail>(`/characters/${id}`)
}

export function fetchLocations(
  filters: LocationFilters,
): Promise<ListResponse<Location>> {
  const search = toQuery({
    page: filters.page ?? 1,
    name: filters.name,
    type: filters.type,
    dimension: filters.dimension,
  })
  return get<ListResponse<Location>>(`/locations?${search}`)
}

export function fetchLocation(id: number): Promise<LocationDetail> {
  return get<LocationDetail>(`/locations/${id}`)
}

export function fetchEpisodes(
  filters: EpisodeFilters,
): Promise<ListResponse<Episode>> {
  const search = toQuery({
    page: filters.page ?? 1,
    name: filters.name,
    episode: filters.episode,
  })
  return get<ListResponse<Episode>>(`/episodes?${search}`)
}

export function fetchEpisode(id: number): Promise<EpisodeDetail> {
  return get<EpisodeDetail>(`/episodes/${id}`)
}

export function fetchStats(): Promise<Stats> {
  return get<Stats>('/stats')
}
