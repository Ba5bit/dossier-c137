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
