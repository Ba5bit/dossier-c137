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

export type CharacterFilters = {
  page?: number
  name?: string
  status?: string
  species?: string
  gender?: string
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

export type LocationFilters = {
  page?: number
  name?: string
  type?: string
  dimension?: string
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

export type EpisodeFilters = {
  page?: number
  name?: string
  episode?: string
}
