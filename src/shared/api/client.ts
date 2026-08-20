import type {
  AskEvent,
  AskRequest,
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
  Dossier,
  Persona,
  SearchResponse,
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

export function fetchSearch(q: string): Promise<SearchResponse> {
  return get<SearchResponse>(`/search?${toQuery({ q })}`)
}

export type DossierRequest = {
  entityType: string
  entityId: number
  persona: Persona
}

async function post(path: string, body: unknown): Promise<Response> {
  try {
    return await fetch(`${baseUrl()}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (cause) {
    throw new ApiError('NETWORK', (cause as Error).message)
  }
}

async function raiseFor(response: Response): Promise<never> {
  const payload = await response.json().catch(() => null)
  throw new ApiError(
    payload?.error?.code ?? 'UNKNOWN',
    payload?.error?.message ?? `Request failed (${response.status})`,
  )
}

export async function postDossier(body: DossierRequest): Promise<Dossier> {
  const response = await post('/dossier', body)
  if (!response.ok) await raiseFor(response)
  return await response.json() as Dossier
}

function parseFrame(frame: string): AskEvent | null {
  const dataLine = frame
    .split('\n')
    .find((line) => line.startsWith('data:'))
  if (!dataLine) return null

  try {
    return JSON.parse(dataLine.slice('data:'.length).trim()) as AskEvent
  } catch {
    return null
  }
}

/**
 * EventSource cannot POST, and the question, the persona and the history all
 * have to travel in a body — so the stream is read off fetch by hand. A
 * network read is not a frame boundary, hence the buffer.
 */
export async function* streamAsk(
  body: AskRequest,
  signal?: AbortSignal,
): AsyncGenerator<AskEvent> {
  let response: Response
  try {
    response = await fetch(`${baseUrl()}/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
  } catch (cause) {
    throw new ApiError('NETWORK', (cause as Error).message)
  }

  if (!response.ok) await raiseFor(response)
  if (!response.body) throw new ApiError('NETWORK', 'The stream carried no body')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const frames = buffer.split('\n\n')
    buffer = frames.pop() ?? ''

    for (const frame of frames) {
      const event = parseFrame(frame)
      if (event) yield event
    }
  }
}
