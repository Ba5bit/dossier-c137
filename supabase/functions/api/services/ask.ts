import { askSystemPrompt } from '../lib/persona.ts'
import type { ChatMessage } from '../clients/grokClient.ts'
import type { Resolved } from '../lib/cache.ts'
import type {
  AskEvent,
  AskSource,
  ChatTurn,
  Persona,
  SearchResponse,
} from '../types.ts'

/** Six records is what fits in a prompt without diluting the question. */
export const MAX_SOURCES = 6

/** Three extra lookups is where retrieval stops paying for itself. */
export const MAX_TERMS = 3

const STOPWORDS = new Set([
  'a', 'about', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at', 'be', 'been',
  'but', 'by', 'can', 'did', 'do', 'does', 'for', 'from', 'get', 'had', 'has',
  'have', 'he', 'her', 'him', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it',
  'its', 'just', 'me', 'my', 'not', 'of', 'on', 'or', 'she', 'so', 'tell', 'that',
  'the', 'their', 'them', 'then', 'there', 'they', 'this', 'to', 'up', 'was',
  'we', 'what', 'when', 'where', 'which', 'who', 'whom', 'why', 'will', 'with',
  'you', 'your',
])

type SearchLike = {
  search(query: string): Promise<Resolved<SearchResponse>>
}

type GrokLike = {
  stream(messages: ChatMessage[]): AsyncGenerator<string>
}

export type AskInput = {
  q: string
  persona: Persona
  history: ChatTurn[]
}

/**
 * Retrieval by name is all the upstream offers, so the question is reduced to
 * the words most likely to be one. Sorted, so the same question always
 * produces the same lookups and therefore the same cache keys.
 */
export function extractTerms(question: string): string[] {
  const words = question
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word))

  return Array.from(new Set(words)).sort().slice(0, MAX_TERMS)
}

function toSources(response: SearchResponse): AskSource[] {
  return [
    ...response.groups.characters.items.map((item) => ({
      type: 'character' as const,
      id: item.id,
      name: item.name,
    })),
    ...response.groups.locations.items.map((item) => ({
      type: 'location' as const,
      id: item.id,
      name: item.name,
    })),
    ...response.groups.episodes.items.map((item) => ({
      type: 'episode' as const,
      id: item.id,
      name: item.name,
    })),
  ]
}

function describe(response: SearchResponse, source: AskSource): string {
  if (source.type === 'character') {
    const item = response.groups.characters.items.find((c) => c.id === source.id)
    if (!item) return ''
    return `character #${item.id} ${item.name} — status ${item.status}, species ${item.species}, origin ${item.origin.name}, last seen ${item.location.name}, appears in ${item.episodeCount} episodes`
  }

  if (source.type === 'location') {
    const item = response.groups.locations.items.find((l) => l.id === source.id)
    if (!item) return ''
    return `location #${item.id} ${item.name} — type ${item.type}, dimension ${item.dimension}, ${item.residentCount} known residents`
  }

  const item = response.groups.episodes.items.find((e) => e.id === source.id)
  if (!item) return ''
  return `episode #${item.id} ${item.name} (${item.episode}) — aired ${item.airDate}, ${item.characterCount} characters`
}

export function createAskService(search: SearchLike, grok: GrokLike) {
  async function retrieve(question: string) {
    const responses: SearchResponse[] = []

    const whole = await search.search(question)
    responses.push(whole.payload)

    // Only widen the net when the literal question found nothing — most
    // questions carry the name inside them, and one lookup is cheaper.
    if (toSources(whole.payload).length === 0) {
      const terms = extractTerms(question)
      const extra = await Promise.all(terms.map((term) => search.search(term)))
      for (const result of extra) responses.push(result.payload)
    }

    const sources: AskSource[] = []
    const lines: string[] = []
    const seen = new Set<string>()

    for (const response of responses) {
      for (const source of toSources(response)) {
        const key = `${source.type}/${source.id}`
        if (seen.has(key)) continue
        seen.add(key)
        sources.push(source)
        lines.push(describe(response, source))
        if (sources.length === MAX_SOURCES) return { sources, lines }
      }
    }

    return { sources, lines }
  }

  async function* ask(input: AskInput): AsyncGenerator<AskEvent> {
    const { sources, lines } = await retrieve(input.q)

    // Sources first: the visitor sees what the answer stands on while it is
    // still being written, and a mid-stream failure does not lose them.
    yield { type: 'sources', sources }

    const context = lines.length > 0
      ? `CONTEXT\n${lines.join('\n')}\nEND CONTEXT`
      : 'CONTEXT\nno records matched this question\nEND CONTEXT'

    const messages: ChatMessage[] = [
      { role: 'system', content: askSystemPrompt(input.persona) },
      ...input.history.map((turn) => ({ role: turn.role, content: turn.content })),
      { role: 'user', content: `${context}\n\nQUESTION\n${input.q}` },
    ]

    for await (const text of grok.stream(messages)) {
      yield { type: 'token', text }
    }
  }

  return { ask }
}

export type AskService = ReturnType<typeof createAskService>
