export type CharacterStatus = 'alive' | 'dead' | 'unknown'
export type CharacterGender = 'female' | 'male' | 'genderless' | 'unknown'

export type CharacterQuery = {
  page: number
  name?: string
  status?: CharacterStatus
  species?: string
  gender?: CharacterGender
}

export type CharacterRef = {
  name: string
  id: number | null
}

export type Character = {
  id: number
  name: string
  status: string
  species: string
  type: string
  gender: string
  image: string
  origin: CharacterRef
  location: CharacterRef
  episodeCount: number
}

export type Pagination = {
  page: number
  pageCount: number
  total: number
  pageSize: number
}

export type ListResponse<T> = {
  items: T[]
  pagination: Pagination
}

export type RelationRef = {
  id: number | null
  name: string
  resolved: boolean
}

export type EpisodeSummary = {
  id: number
  name: string
  episode: string
}

export type CharacterSummary = {
  id: number
  name: string
  status: string
  image: string
}

export type CharacterDetail = {
  character: Character
  origin: RelationRef
  location: RelationRef
  episodes: EpisodeSummary[]
}

export type LocationQuery = {
  page: number
  name?: string
  type?: string
  dimension?: string
}

export type Location = {
  id: number
  name: string
  type: string
  dimension: string
  residentCount: number
}

export type LocationDetail = {
  location: Location
  residents: CharacterSummary[]
}

export type EpisodeQuery = {
  page: number
  name?: string
  episode?: string
}

export type Episode = {
  id: number
  name: string
  airDate: string
  episode: string
  characterCount: number
}

export type EpisodeDetail = {
  episode: Episode
  characters: CharacterSummary[]
}

export type EntityCount = {
  total: number
  pages: number
}

export type Stats = {
  characters: EntityCount
  locations: EntityCount
  episodes: EntityCount
  ricks: number
  mortys: number
}

export type SearchGroup<T> = {
  items: T[]
  total: number
}

export type SearchResponse = {
  query: string
  groups: {
    characters: SearchGroup<Character>
    locations: SearchGroup<Location>
    episodes: SearchGroup<Episode>
  }
}

export type Persona = 'rick' | 'morty'

export type Dossier = {
  entityType: string
  entityId: number
  persona: Persona
  text: string
  model: string
  promptVersion: number
  cached: boolean
}

export type AskSource = {
  type: 'character' | 'location' | 'episode'
  id: number
  name: string
}

export type AskEvent =
  | { type: 'sources'; sources: AskSource[]; citable: AskSource[] }
  | { type: 'token'; text: string }
  | { type: 'suggestions'; suggestions: string[] }
  | { type: 'error'; code: string; message: string }

export type ChatTurn = {
  role: 'user' | 'assistant'
  content: string
}

/**
 * The record the visitor has open while they ask. It is resolved in full,
 * relations included, so a question about what is already on screen is not
 * answered off a name search.
 */
export type AskFocus = {
  type: 'character' | 'location' | 'episode'
  id: number
}
