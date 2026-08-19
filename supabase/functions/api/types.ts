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
