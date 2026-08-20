import { assertEquals, assertStringIncludes } from 'jsr:@std/assert'
import { createAskService, extractTerms, MAX_SOURCES } from '../services/ask.ts'
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
  })
  assertEquals(events.slice(1), [
    { type: 'token', text: 'Bird' },
    { type: 'token', text: 'person.' },
  ])
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

  assertEquals(events[0], { type: 'sources', sources: [] })
  assertStringIncludes(grok.calls[0][1].content, 'no records matched')
})
