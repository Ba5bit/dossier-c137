import type { Character, CharacterFilters, ListResponse } from './types'

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

export function fetchCharacters(
  filters: CharacterFilters,
): Promise<ListResponse<Character>> {
  const params = new URLSearchParams()
  params.set('page', String(filters.page ?? 1))
  if (filters.name) params.set('name', filters.name)
  if (filters.status) params.set('status', filters.status)
  if (filters.species) params.set('species', filters.species)
  if (filters.gender) params.set('gender', filters.gender)

  return get<ListResponse<Character>>(`/characters?${params.toString()}`)
}
