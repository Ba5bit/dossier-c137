import { askSystemPrompt, SUGGEST_MARKER } from '../lib/persona.ts'
import type { ChatMessage } from '../clients/grokClient.ts'
import type { Resolved } from '../lib/cache.ts'
import type {
  AskEvent,
  AskFocus,
  AskSource,
  CharacterDetail,
  ChatTurn,
  EpisodeDetail,
  LocationDetail,
  Persona,
  SearchResponse,
} from '../types.ts'

/** Six records is what fits in a prompt without diluting the question. */
export const MAX_SOURCES = 6

/** Three extra lookups is where retrieval stops paying for itself. */
export const MAX_TERMS = 3

/** Three follow-ups is one row of buttons, not a menu. */
export const MAX_SUGGESTIONS = 3

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

/**
 * The three detail lookups, as the router already holds them. The focused
 * record is read through these rather than through search, because only they
 * carry the relations — a character's episodes, a location's residents —
 * and those relations are the whole reason to know what page the visitor
 * is on.
 */
export type DetailsLike = {
  character(id: number): Promise<Resolved<CharacterDetail>>
  location(id: number): Promise<Resolved<LocationDetail>>
  episode(id: number): Promise<Resolved<EpisodeDetail>>
}

/** Enough of a relation list to answer with, short of flooding the prompt. */
export const MAX_RELATED = 24

export type AskInput = {
  q: string
  persona: Persona
  history: ChatTurn[]
  focus?: AskFocus
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

/**
 * The model closes on a SUGGEST: line. Whatever follows the marker is split on
 * pipes and scrubbed of the list decoration models like to add; anything too
 * short to be a question or too long to fit a button is dropped rather than
 * repaired.
 */
export function parseSuggestions(tail: string): string[] {
  return tail
    .split('|')
    .map((part) => part.replace(/^[\s\-*\d.)]+/, '').trim())
    .filter((part) => part.length > 3 && part.length <= 80)
    .slice(0, MAX_SUGGESTIONS)
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


/**
 * The focused record, written out with its relations. A question asked while
 * a dossier is open ("where did he appear?", "who lives here?") is about this
 * block, and a name search cannot produce it: searching "Evil Morty" returns
 * every clone whose name starts with Evil.
 */
export function describeFocus(
  focus: AskFocus,
  detail: CharacterDetail | LocationDetail | EpisodeDetail,
): { source: AskSource; related: AskSource[]; lines: string[] } {
  if (focus.type === 'character') {
    const { character, episodes } = detail as CharacterDetail
    const appearances = episodes
      .slice(0, MAX_RELATED)
      .map((episode) => `#${episode.id} ${episode.episode} ${episode.name}`)
      .join('; ')

    return {
      source: { type: 'character', id: character.id, name: character.name },
      related: episodes.slice(0, MAX_RELATED).map((episode) => ({
        type: 'episode' as const,
        id: episode.id,
        name: episode.name,
      })),
      lines: [
        `character #${character.id} ${character.name} — status ${character.status}, species ${character.species}, gender ${character.gender}, origin ${character.origin.name}, last seen ${character.location.name}`,
        `appears in ${character.episodeCount} episodes: ${appearances || 'none on file'}`,
      ],
    }
  }

  if (focus.type === 'location') {
    const { location, residents } = detail as LocationDetail
    const names = residents.slice(0, MAX_RELATED).map((r) => `#${r.id} ${r.name}`).join('; ')

    return {
      source: { type: 'location', id: location.id, name: location.name },
      related: residents.slice(0, MAX_RELATED).map((resident) => ({
        type: 'character' as const,
        id: resident.id,
        name: resident.name,
      })),
      lines: [
        `location #${location.id} ${location.name} — type ${location.type}, dimension ${location.dimension}, ${location.residentCount} known residents`,
        `residents on file: ${names || 'none on file'}`,
      ],
    }
  }

  const { episode, characters } = detail as EpisodeDetail
  const names = characters.slice(0, MAX_RELATED).map((c) => `#${c.id} ${c.name}`).join('; ')

  return {
    source: { type: 'episode', id: episode.id, name: episode.name },
    related: characters.slice(0, MAX_RELATED).map((c) => ({
      type: 'character' as const,
      id: c.id,
      name: c.name,
    })),
    lines: [
      `episode #${episode.id} ${episode.name} (${episode.episode}) — aired ${episode.airDate}, ${episode.characterCount} characters`,
      `characters on file: ${names || 'none on file'}`,
    ],
  }
}

export function createAskService(
  search: SearchLike,
  grok: GrokLike,
  details?: DetailsLike,
) {
  async function resolveFocus(focus: AskFocus | undefined) {
    if (!focus || !details) return null

    try {
      if (focus.type === 'character') {
        return describeFocus(focus, (await details.character(focus.id)).payload)
      }
      if (focus.type === 'location') {
        return describeFocus(focus, (await details.location(focus.id)).payload)
      }
      return describeFocus(focus, (await details.episode(focus.id)).payload)
    } catch {
      // A focus that will not resolve is a stale link or a deleted record.
      // The question was still asked, and it still deserves an answer.
      return null
    }
  }

  async function retrieve(question: string, focused: boolean) {
    const responses: SearchResponse[] = []

    const whole = await search.search(question)
    responses.push(whole.payload)

    // Only widen the net when the literal question found nothing — most
    // questions carry the name inside them, and one lookup is cheaper.
    //
    // Never widen it for a question asked with a record open. "who lives
    // here?" has no name in it, and the loose words it does have dragged in
    // whatever the registry happened to match — the subject is already known.
    if (!focused && toSources(whole.payload).length === 0) {
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
    const focused = await resolveFocus(input.focus)
    const found = await retrieve(input.q, focused !== null)

    // The open record leads, and never appears twice: a search for its own
    // name would otherwise cite it a second time from a thinner description.
    const sources = focused
      ? [
        focused.source,
        ...found.sources.filter(
          (source) =>
            !(source.type === focused.source.type && source.id === focused.source.id),
        ),
      ].slice(0, MAX_SOURCES)
      : found.sources

    const lines = focused
      ? [`ON SCREEN — the visitor is reading this record right now:`, ...focused.lines, ...found.lines]
      : found.lines

    // Sources first: the visitor sees what the answer stands on while it is
    // still being written, and a mid-stream failure does not lose them.
    // The chips say what the answer stands on. The related records are not
    // chips — they would bury the page under two dozen of them — but the
    // answer may name one, and a named record has to be reachable.
    yield { type: 'sources', sources, citable: focused?.related ?? [] }

    const context = lines.length > 0
      ? `CONTEXT\n${lines.join('\n')}\nEND CONTEXT`
      : 'CONTEXT\nthe archive holds no matching records for this question, so answer from the show itself\nEND CONTEXT'

    const messages: ChatMessage[] = [
      { role: 'system', content: askSystemPrompt(input.persona) },
      ...input.history.map((turn) => ({ role: turn.role, content: turn.content })),
      { role: 'user', content: `${context}\n\nQUESTION\n${input.q}` },
    ]

    // Tokens arrive split at arbitrary points, so the marker could be handed
    // over one character at a time. All but the last few characters go out as
    // they arrive; the held-back tail is what makes the marker recognisable
    // before any of it reaches the browser.
    const hold = SUGGEST_MARKER.length - 1
    let buffer = ''
    let tail = ''
    let suggesting = false

    for await (const text of grok.stream(messages)) {
      if (suggesting) {
        tail += text
        continue
      }

      buffer += text
      const marker = buffer.indexOf(SUGGEST_MARKER)

      if (marker !== -1) {
        const answer = buffer.slice(0, marker)
        if (answer !== '') yield { type: 'token', text: answer }
        tail = buffer.slice(marker + SUGGEST_MARKER.length)
        buffer = ''
        suggesting = true
        continue
      }

      if (buffer.length > hold) {
        yield { type: 'token', text: buffer.slice(0, buffer.length - hold) }
        buffer = buffer.slice(buffer.length - hold)
      }
    }

    if (!suggesting && buffer !== '') yield { type: 'token', text: buffer }

    yield { type: 'suggestions', suggestions: parseSuggestions(tail) }
  }

  return { ask }
}

export type AskService = ReturnType<typeof createAskService>
