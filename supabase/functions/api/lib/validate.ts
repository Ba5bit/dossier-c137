import { ValidationError } from './errors.ts'
import type {
  CharacterGender,
  CharacterQuery,
  CharacterStatus,
} from '../types.ts'

const STATUSES: CharacterStatus[] = ['alive', 'dead', 'unknown']
const GENDERS: CharacterGender[] = ['female', 'male', 'genderless', 'unknown']

function parsePage(raw: string | null): number {
  if (raw === null || raw === '') return 1
  if (!/^\d+$/.test(raw)) {
    throw new ValidationError(`page must be a positive integer, received "${raw}"`)
  }
  const page = Number(raw)
  if (page < 1) {
    throw new ValidationError(`page must be at least 1, received ${page}`)
  }
  return page
}

function parseText(raw: string | null): string | undefined {
  if (raw === null) return undefined
  const trimmed = raw.trim()
  return trimmed === '' ? undefined : trimmed
}

function parseEnum<T extends string>(
  raw: string | null,
  allowed: T[],
  field: string,
): T | undefined {
  const value = parseText(raw)
  if (value === undefined) return undefined
  const lowered = value.toLowerCase() as T
  if (!allowed.includes(lowered)) {
    throw new ValidationError(
      `${field} must be one of ${allowed.join(', ')}, received "${value}"`,
    )
  }
  return lowered
}

export function parseCharacterQuery(params: URLSearchParams): CharacterQuery {
  return {
    page: parsePage(params.get('page')),
    name: parseText(params.get('name')),
    status: parseEnum(params.get('status'), STATUSES, 'status'),
    species: parseText(params.get('species')),
    gender: parseEnum(params.get('gender'), GENDERS, 'gender'),
  }
}

export function parseId(raw: string): number {
  if (!/^\d+$/.test(raw)) {
    throw new ValidationError(`id must be a positive integer, received "${raw}"`)
  }
  const id = Number(raw)
  if (id < 1) {
    throw new ValidationError(`id must be at least 1, received ${id}`)
  }
  return id
}
