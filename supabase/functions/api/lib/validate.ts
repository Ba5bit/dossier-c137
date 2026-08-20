import { ValidationError } from './errors.ts'
import { parsePersona } from './persona.ts'
import type {
  CharacterGender,
  CharacterQuery,
  CharacterStatus,
  EpisodeQuery,
  LocationQuery,
} from '../types.ts'
import type { AskFocus, ChatTurn, Persona } from '../types.ts'

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

export function parseLocationQuery(params: URLSearchParams): LocationQuery {
  return {
    page: parsePage(params.get('page')),
    name: parseText(params.get('name')),
    type: parseText(params.get('type')),
    dimension: parseText(params.get('dimension')),
  }
}

export function parseEpisodeQuery(params: URLSearchParams): EpisodeQuery {
  return {
    page: parsePage(params.get('page')),
    name: parseText(params.get('name')),
    episode: parseText(params.get('episode')),
  }
}

export const SEARCH_MIN = 2
export const SEARCH_MAX = 100

export function parseSearchQuery(params: URLSearchParams): string {
  const value = parseText(params.get('q'))
  if (value === undefined) {
    throw new ValidationError('q is required')
  }
  if (value.length < SEARCH_MIN) {
    throw new ValidationError(`q must be at least ${SEARCH_MIN} characters`)
  }
  if (value.length > SEARCH_MAX) {
    throw new ValidationError(`q must be at most ${SEARCH_MAX} characters`)
  }
  return value
}

export const ASK_MIN = 3
export const ASK_MAX = 300
export const MAX_HISTORY = 6

export type DossierBody = {
  entityType: string
  entityId: number
  persona: Persona
}

export type AskBody = {
  q: string
  persona: Persona
  history: ChatTurn[]
  focus?: AskFocus
}

const FOCUS_TYPES = ['character', 'location', 'episode']

/**
 * The page the visitor is on, as the browser reports it. An unreadable focus
 * is dropped rather than rejected: it is an enrichment, and losing it costs
 * the answer precision, not correctness.
 */
function parseFocus(raw: unknown): AskFocus | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const candidate = raw as Record<string, unknown>

  if (typeof candidate.type !== 'string') return undefined
  if (!FOCUS_TYPES.includes(candidate.type)) return undefined

  const id = Number(candidate.id)
  if (!Number.isInteger(id) || id < 1) return undefined

  return { type: candidate.type as AskFocus['type'], id }
}

function asRecord(raw: unknown): Record<string, unknown> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new ValidationError('body must be an object')
  }
  return raw as Record<string, unknown>
}

/** A request whose body is not JSON is a client error, not a crash. */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw new ValidationError('body must be valid JSON')
  }
}

export function parseDossierBody(raw: unknown): DossierBody {
  const body = asRecord(raw)

  if (body.entityId === undefined || body.entityId === null) {
    throw new ValidationError('entityId is required')
  }

  return {
    entityType: typeof body.entityType === 'string' ? body.entityType : 'character',
    entityId: parseId(String(body.entityId)),
    persona: parsePersona(body.persona),
  }
}

export function parseAskBody(raw: unknown): AskBody {
  const body = asRecord(raw)
  const q = parseText(typeof body.q === 'string' ? body.q : null)

  if (q === undefined) {
    throw new ValidationError('q is required')
  }
  if (q.length < ASK_MIN) {
    throw new ValidationError(`q must be at least ${ASK_MIN} characters`)
  }
  if (q.length > ASK_MAX) {
    throw new ValidationError(`q must be at most ${ASK_MAX} characters`)
  }

  // History arrives from the browser, so it is filtered rather than trusted:
  // only user and assistant turns survive, which closes the obvious door to
  // injecting a second system prompt.
  const rawHistory = Array.isArray(body.history) ? body.history : []
  const history: ChatTurn[] = rawHistory
    .filter((turn): turn is ChatTurn => {
      if (typeof turn !== 'object' || turn === null) return false
      const candidate = turn as Record<string, unknown>
      return (
        (candidate.role === 'user' || candidate.role === 'assistant') &&
        typeof candidate.content === 'string' &&
        candidate.content.trim() !== ''
      )
    })
    .slice(-MAX_HISTORY)
    .map((turn) => ({ role: turn.role, content: turn.content.slice(0, ASK_MAX) }))

  return {
    q,
    persona: parsePersona(body.persona),
    history,
    focus: parseFocus(body.focus),
  }
}
