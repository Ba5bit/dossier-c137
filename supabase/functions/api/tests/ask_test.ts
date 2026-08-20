import { assertEquals, assertStringIncludes } from 'jsr:@std/assert'
import {
  createAskService,
  extractTerms,
  MAX_SOURCES,
  parseSuggestions,
} from '../services/ask.ts'
import type { ChatMessage } from '../clients/grokClient.ts'
import type { AskEvent, SearchResponse } from '../types.ts'

function character(id: number, name: string) {
  return {
    id,
    name,
    status: 'Alive',
    species: 'Bird-Person',
    type: '',
    gender: 'Male',
    image: `https://example.test/${id}.jpeg`,
    origin: { name: 'Bird World', id: 5 },
    location: { name: 'Bird World', id: 5 },
    episodeCount: 7,
  }
}

function location(id: number, name: string) {
  return { id, name, type: 'Planet', dimension: 'unknown', residentCount: 4 }
}

function empty(query: string): SearchResponse {
  return {
    query,
    groups: {
      characters: { items: [], total: 0 },
      locations: { items: [], total: 0 },
      episodes: { items: [], total: 0 },
    },
  }
}

function stubSearch(byQuery: Record<string, SearchResponse>) {
  const queries: string[] = []
  return {
    queries,
    service: {
      search: async (query: string) => {
        queries.push(query)
        return { payload: byQuery[query] ?? empty(query), stale: false }
      },
    },
  }
}

function stubGrok(chunks: string[] = ['Bird', 'person.']) {
  const calls: ChatMessage[][] = []
  return {
    calls,
    client: {
      model: 'grok-test',
      complete: async () => chunks.join(''),
      stream: async function* (messages: ChatMessage[]) {
        calls.push(messages)
        for (const chunk of chunks) yield chunk
      },
    },
  }
}

async function collect(events: AsyncGenerator<AskEvent>): Promise<AskEvent[]> {
  const seen: AskEvent[] = []
  for await (const event of events) seen.push(event)
  return seen
}

function withCharacters(query: string, items: ReturnType<typeof character>[]): SearchResponse {
  return {
    query,
    groups: {
      characters: { items, total: items.length },
      locations: { items: [], total: 0 },
      episodes: { items: [], total: 0 },
    },
  }
}

/** The tokens carry no frame boundaries of their own, only the answer does. */
function text(events: AskEvent[]): string {
  return events
    .filter((event) => event.type === 'token')
    .map((event) => (event.type === 'token' ? event.text : ''))
    .join('')
}

function suggestions(events: AskEvent[]): string[] {
  const event = events.find((candidate) => candidate.type === 'suggestions')
  return event && event.type === 'suggestions' ? event.suggestions : []
}

Deno.test('drops stopwords and punctuation when extracting terms', () => {
  assertEquals(extractTerms('who is Birdperson?'), ['birdperson'])
  assertEquals(extractTerms('what happened to Rick and Morty in the Citadel'), [
    'citadel',
    'happened',
    'morty',
  ])
})

Deno.test('extracts at most three terms', () => {
  assertEquals(extractTerms('rick morty summer beth jerry').length, 3)
})

Deno.test('emits the sources before the first token', async () => {
  const search = stubSearch({
    'who is Birdperson?': withCharacters('who is Birdperson?', [character(47, 'Birdperson')]),
  })
  const grok = stubGrok()
  const service = createAskService(search.service, grok.client)

  const events = await collect(
    service.ask({ q: 'who is Birdperson?', persona: 'rick', history: [] }),
  )

  assertEquals(events[0], {
    type: 'sources',
    sources: [{ type: 'character', id: 47, name: 'Birdperson' }],
    citable: [],
  })
  assertEquals(text(events), 'Birdperson.')
})

Deno.test('falls back to the extracted terms when the whole question matches nothing', async () => {
  const search = stubSearch({
    birdperson: withCharacters('birdperson', [character(47, 'Birdperson')]),
  })
  const grok = stubGrok()
  const service = createAskService(search.service, grok.client)

  const events = await collect(
    service.ask({ q: 'who is Birdperson?', persona: 'rick', history: [] }),
  )

  assertEquals(search.queries, ['who is Birdperson?', 'birdperson'])
  assertEquals(events[0], {
    type: 'sources',
    sources: [{ type: 'character', id: 47, name: 'Birdperson' }],
    citable: [],
  })
})

Deno.test('caps the sources and never repeats one', async () => {
  const many: SearchResponse = {
    query: 'rick',
    groups: {
      characters: {
        items: Array.from({ length: 20 }, (_, i) => character(i + 1, `Rick ${i + 1}`)),
        total: 107,
      },
      locations: { items: [location(3, 'Citadel of Ricks')], total: 1 },
      episodes: { items: [], total: 0 },
    },
  }
  const search = stubSearch({ rick: many })
  const grok = stubGrok()
  const service = createAskService(search.service, grok.client)

  const events = await collect(service.ask({ q: 'rick', persona: 'rick', history: [] }))
  const sources = events[0].type === 'sources' ? events[0].sources : []

  assertEquals(sources.length, MAX_SOURCES)
  assertEquals(new Set(sources.map((s) => `${s.type}/${s.id}`)).size, MAX_SOURCES)
})

Deno.test('puts the retrieved records in the prompt as the only source of facts', async () => {
  const search = stubSearch({
    'who is Birdperson?': withCharacters('who is Birdperson?', [character(47, 'Birdperson')]),
  })
  const grok = stubGrok()
  const service = createAskService(search.service, grok.client)

  await collect(service.ask({ q: 'who is Birdperson?', persona: 'morty', history: [] }))

  const messages = grok.calls[0]
  assertEquals(messages[0].role, 'system')
  assertStringIncludes(messages[0].content, 'Morty Smith')
  const last = messages[messages.length - 1]
  assertStringIncludes(last.content, 'CONTEXT')
  assertStringIncludes(last.content, 'Birdperson')
  assertStringIncludes(last.content, 'who is Birdperson?')
})

Deno.test('carries the conversation history between the system prompt and the question', async () => {
  const search = stubSearch({})
  const grok = stubGrok()
  const service = createAskService(search.service, grok.client)

  await collect(
    service.ask({
      q: 'and then?',
      persona: 'rick',
      history: [
        { role: 'user', content: 'who is Birdperson?' },
        { role: 'assistant', content: 'A bird. A person. Keep up.' },
      ],
    }),
  )

  const messages = grok.calls[0]
  assertEquals(messages.length, 4)
  assertEquals(messages[1], { role: 'user', content: 'who is Birdperson?' })
  assertEquals(messages[2], { role: 'assistant', content: 'A bird. A person. Keep up.' })
})

Deno.test('says so in the context when nothing matched, rather than skipping the call', async () => {
  const search = stubSearch({})
  const grok = stubGrok()
  const service = createAskService(search.service, grok.client)

  const events = await collect(
    service.ask({ q: 'who is Gandalf?', persona: 'rick', history: [] }),
  )

  assertEquals(events[0], { type: 'sources', sources: [], citable: [] })
  assertStringIncludes(grok.calls[0][1].content, 'no matching records')
})

Deno.test('keeps the SUGGEST tail out of the answer and emits it as follow-ups', async () => {
  const search = stubSearch({})
  const grok = stubGrok([
    'A bird. A pers',
    'on. Keep up.\nSUGG',
    'EST: Who runs the Citadel? | Why doe',
    's Rick drink? | What is a Meeseeks?',
  ])
  const service = createAskService(search.service, grok.client)

  const events = await collect(service.ask({ q: 'birdperson', persona: 'rick', history: [] }))

  assertEquals(text(events).trim(), 'A bird. A person. Keep up.')
  assertEquals(suggestions(events), [
    'Who runs the Citadel?',
    'Why does Rick drink?',
    'What is a Meeseeks?',
  ])
})

Deno.test('emits an empty follow-up list when the model omits the marker', async () => {
  const search = stubSearch({})
  const grok = stubGrok(['Just', ' an answer.'])
  const service = createAskService(search.service, grok.client)

  const events = await collect(service.ask({ q: 'anything', persona: 'rick', history: [] }))

  assertEquals(text(events), 'Just an answer.')
  assertEquals(suggestions(events), [])
})

Deno.test('strips list decoration and drops follow-ups that cannot be questions', () => {
  assertEquals(parseSuggestions(' 1. Who is Evil Morty? | - ok | Why? '), [
    'Who is Evil Morty?',
  ])
  assertEquals(parseSuggestions(' a | b | c | d | e ').length, 0)
})

function stubDetails() {
  return {
    character: (id: number) =>
      Promise.resolve({
        payload: {
          character: character(id, 'Evil Morty'),
          origin: { id: null, name: 'unknown', resolved: false },
          location: { id: 3, name: 'Citadel of Ricks', resolved: true },
          episodes: [
            { id: 10, name: 'Close Rick-counters of the Rick Kind', episode: 'S01E10' },
            { id: 28, name: 'The Ricklantis Mixup', episode: 'S03E07' },
          ],
        },
        stale: false,
      }),
    location: (id: number) =>
      Promise.resolve({
        payload: {
          location: location(id, 'Citadel of Ricks'),
          residents: [{ id: 1, name: 'Rick Sanchez', status: 'Alive', image: '' }],
        },
        stale: false,
      }),
    episode: (id: number) =>
      Promise.resolve({
        payload: {
          episode: {
            id,
            name: 'The Ricklantis Mixup',
            airDate: 'September 10, 2017',
            episode: 'S03E07',
            characterCount: 2,
          },
          characters: [{ id: 118, name: 'Evil Morty', status: 'Alive', image: '' }],
        },
        stale: false,
      }),
  }
}

Deno.test('puts the record on screen at the head of the context, relations and all', async () => {
  const search = stubSearch({})
  const grok = stubGrok()
  const service = createAskService(search.service, grok.client, stubDetails())

  const events = await collect(
    service.ask({
      q: 'where did he appear?',
      persona: 'rick',
      history: [],
      focus: { type: 'character', id: 118 },
    }),
  )

  const prompt = grok.calls[0][1].content
  assertStringIncludes(prompt, 'ON SCREEN')
  assertStringIncludes(prompt, 'S03E07 The Ricklantis Mixup')
  assertEquals(events[0], {
    type: 'sources',
    sources: [{ type: 'character', id: 118, name: 'Evil Morty' }],
    citable: [
      { type: 'episode', id: 10, name: 'Close Rick-counters of the Rick Kind' },
      { type: 'episode', id: 28, name: 'The Ricklantis Mixup' },
    ],
  })
})

Deno.test('never cites the focused record twice', async () => {
  const search = stubSearch({
    'evil morty': withCharacters('evil morty', [character(118, 'Evil Morty')]),
  })
  const grok = stubGrok()
  const service = createAskService(search.service, grok.client, stubDetails())

  const events = await collect(
    service.ask({
      q: 'evil morty',
      persona: 'rick',
      history: [],
      focus: { type: 'character', id: 118 },
    }),
  )

  const sources = events[0].type === 'sources' ? events[0].sources : []
  assertEquals(sources.length, 1)
})

Deno.test('answers anyway when the focused record will not resolve', async () => {
  const search = stubSearch({})
  const grok = stubGrok()
  const details = {
    ...stubDetails(),
    character: () => Promise.reject(new Error('404')),
  }
  const service = createAskService(search.service, grok.client, details)

  const events = await collect(
    service.ask({
      q: 'anything',
      persona: 'rick',
      history: [],
      focus: { type: 'character', id: 9999 },
    }),
  )

  assertEquals(events[0], { type: 'sources', sources: [], citable: [] })
  assertEquals(text(events), 'Birdperson.')
})

Deno.test('does not widen a focused question into a name search', async () => {
  const search = stubSearch({})
  const grok = stubGrok()
  const service = createAskService(search.service, grok.client, stubDetails())

  await collect(
    service.ask({
      q: 'who lives here?',
      persona: 'rick',
      history: [],
      focus: { type: 'location', id: 3 },
    }),
  )

  // The loose words of a question asked with a record open used to drag in
  // whatever the registry matched — "Hole in the Wall Where the Men Can See
  // it All" was cited as an answer to "who lives here?".
  assertEquals(search.queries, ['who lives here?'])
})

Deno.test('offers the residents of a focused location as citable records', async () => {
  const search = stubSearch({})
  const grok = stubGrok()
  const service = createAskService(search.service, grok.client, stubDetails())

  const events = await collect(
    service.ask({
      q: 'who lives here?',
      persona: 'rick',
      history: [],
      focus: { type: 'location', id: 3 },
    }),
  )

  const first = events[0]
  assertEquals(first.type === 'sources' ? first.citable : [], [
    { type: 'character', id: 1, name: 'Rick Sanchez' },
  ])
})
