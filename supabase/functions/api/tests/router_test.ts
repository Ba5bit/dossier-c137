import { assertEquals } from 'jsr:@std/assert'
import { normalizePath, createRouter } from '../router.ts'
import { AiError, NotFoundError, RateLimitError } from '../lib/errors.ts'

const emptyList = {
  items: [],
  pagination: { page: 1, pageCount: 0, total: 0, pageSize: 20 },
}

const character = {
  id: 1,
  name: 'Rick Sanchez',
  status: 'Alive',
  species: 'Human',
  type: '',
  gender: 'Male',
  image: 'https://example.test/1.jpeg',
  origin: { name: 'Earth (C-137)', id: 1 },
  location: { name: 'Citadel of Ricks', id: 3 },
  episodeCount: 51,
}

// Typed against the router's own bundle so that an override with the wrong
// shape fails type-checking rather than at runtime.
type StubServices = Parameters<typeof createRouter>[0]

function services(overrides: Partial<StubServices> = {}): StubServices {
  return {
    characters: {
      listCharacters: async (query: { page: number }) => ({
        payload: { ...emptyList, pagination: { ...emptyList.pagination, page: query.page, pageCount: 42 } },
        stale: false,
      }),
      getCharacter: async (id: number) => ({
        payload: {
          character: { ...character, id },
          origin: { id: 1, name: 'Earth (C-137)', resolved: true },
          location: { id: 3, name: 'Citadel of Ricks', resolved: true },
          episodes: [],
        },
        stale: false,
      }),
    },
    locations: {
      listLocations: async () => ({ payload: emptyList, stale: false }),
      getLocation: async (id: number) => ({
        payload: {
          location: {
            id,
            name: 'Earth (C-137)',
            type: 'Planet',
            dimension: 'Dimension C-137',
            residentCount: 0,
          },
          residents: [],
        },
        stale: false,
      }),
    },
    episodes: {
      listEpisodes: async () => ({ payload: emptyList, stale: false }),
      getEpisode: async (id: number) => ({
        payload: {
          episode: {
            id,
            name: 'Pilot',
            airDate: 'December 2, 2013',
            episode: 'S01E01',
            characterCount: 0,
          },
          characters: [],
        },
        stale: false,
      }),
    },
    stats: {
      getStats: async () => ({
        payload: {
          characters: { total: 826, pages: 42 },
          locations: { total: 126, pages: 7 },
          episodes: { total: 51, pages: 3 },
          ricks: 112,
          mortys: 53,
        },
        stale: false,
      }),
    },
    search: {
      search: async (query: string) => ({
        payload: {
          query,
          groups: {
            characters: { items: [], total: 0 },
            locations: { items: [], total: 0 },
            episodes: { items: [], total: 0 },
          },
        },
        stale: false,
      }),
    },
    dossier: {
      // Stands in for the generate path: the real service spends the
      // allowance through `onGenerate` only when it is about to write, so a
      // stub that ignored the callback would never reach the quota at all.
      getDossier: async (
        entityType: string,
        entityId: number,
        persona: 'rick' | 'morty',
        onGenerate?: () => Promise<void> | void,
      ) => {
        await onGenerate?.()
        return {
          entityType,
          entityId,
          persona,
          text: 'On file.',
          model: 'grok-test',
          promptVersion: 1,
          cached: false,
        }
      },
    },
    ask: {
      ask: async function* () {
        yield { type: 'sources' as const, sources: [], citable: [] }
      },
    },
    quota: {
      check: async () => {},
    },
    ...overrides,
  }
}

const detail = {
  character,
  origin: { id: 1, name: 'Earth (C-137)', resolved: true },
  location: { id: 3, name: 'Citadel of Ricks', resolved: true },
  episodes: [],
}

Deno.test('strips the function name prefix from the path', () => {
  assertEquals(normalizePath('/api/characters'), '/characters')
  assertEquals(normalizePath('/api/health'), '/health')
})

Deno.test('reduces a bare function path to root', () => {
  assertEquals(normalizePath('/api'), '/')
  assertEquals(normalizePath('/api/'), '/')
})

Deno.test('leaves an already-normalized path alone', () => {
  assertEquals(normalizePath('/characters'), '/characters')
})

Deno.test('answers health checks', async () => {
  const router = createRouter(services())

  const response = await router(new Request('https://x.test/api/health'))

  assertEquals(response.status, 200)
  assertEquals((await response.json()).status, 'ok')
})

Deno.test('routes character list requests to the service', async () => {
  const router = createRouter(services())

  const response = await router(
    new Request('https://x.test/api/characters?page=5'),
  )
  const body = await response.json()

  assertEquals(response.status, 200)
  assertEquals(body.pagination.page, 5)
  assertEquals(body.pagination.pageCount, 42)
})

Deno.test('routes a character detail request by id', async () => {
  const router = createRouter(services())

  const response = await router(new Request('https://x.test/api/characters/7'))
  const body = await response.json()

  assertEquals(response.status, 200)
  assertEquals(body.character.id, 7)
})

Deno.test('returns 400 for a non-numeric detail id', async () => {
  const router = createRouter(services())

  const response = await router(new Request('https://x.test/api/characters/rick'))
  const body = await response.json()

  assertEquals(response.status, 400)
  assertEquals(body.error.code, 'INVALID_PARAMETER')
})

Deno.test('returns 404 when the service reports a missing entity', async () => {
  const router = createRouter(
    services({
      characters: {
        listCharacters: async () => ({ payload: emptyList, stale: false }),
        getCharacter: async () => {
          throw new NotFoundError('No record at /character/99999')
        },
      },
    }),
  )

  const response = await router(new Request('https://x.test/api/characters/99999'))
  const body = await response.json()

  assertEquals(response.status, 404)
  assertEquals(body.error.code, 'NOT_FOUND')
})

Deno.test('marks a stale response with a header', async () => {
  const router = createRouter(
    services({
      characters: {
        listCharacters: async () => ({ payload: emptyList, stale: true }),
        getCharacter: async () => ({ payload: detail, stale: true }),
      },
    }),
  )

  const response = await router(new Request('https://x.test/api/characters'))

  assertEquals(response.headers.get('X-Cache'), 'stale')
})

Deno.test('returns 400 with a typed code for an invalid parameter', async () => {
  const router = createRouter(services())

  const response = await router(
    new Request('https://x.test/api/characters?status=undead'),
  )
  const body = await response.json()

  assertEquals(response.status, 400)
  assertEquals(body.error.code, 'INVALID_PARAMETER')
})

Deno.test('returns 404 for an unknown route', async () => {
  const router = createRouter(services())

  const response = await router(new Request('https://x.test/api/nope'))

  assertEquals(response.status, 404)
})

Deno.test('routes location list requests to the service', async () => {
  const router = createRouter(services())

  const response = await router(new Request('https://x.test/api/locations?page=2'))

  assertEquals(response.status, 200)
})

Deno.test('routes a location detail request by id', async () => {
  const router = createRouter(services())

  const response = await router(new Request('https://x.test/api/locations/3'))
  const body = await response.json()

  assertEquals(response.status, 200)
  assertEquals(body.location.id, 3)
})

Deno.test('returns 400 for a non-numeric location id', async () => {
  const router = createRouter(services())

  const response = await router(new Request('https://x.test/api/locations/earth'))
  const body = await response.json()

  assertEquals(response.status, 400)
  assertEquals(body.error.code, 'INVALID_PARAMETER')
})

Deno.test('routes episode list requests to the service', async () => {
  const router = createRouter(services())

  const response = await router(new Request('https://x.test/api/episodes?episode=S03'))

  assertEquals(response.status, 200)
})

Deno.test('routes an episode detail request by id', async () => {
  const router = createRouter(services())

  const response = await router(new Request('https://x.test/api/episodes/5'))
  const body = await response.json()

  assertEquals(response.status, 200)
  assertEquals(body.episode.id, 5)
})

Deno.test('does not treat a nested path as a detail request', async () => {
  const router = createRouter(services())

  const response = await router(new Request('https://x.test/api/episodes/5/cast'))

  assertEquals(response.status, 404)
})

Deno.test('routes stats requests to the service', async () => {
  const router = createRouter(services())

  const response = await router(new Request('https://x.test/api/stats'))
  const body = await response.json()

  assertEquals(response.status, 200)
  assertEquals(body.characters.total, 826)
  assertEquals(body.ricks, 112)
})

Deno.test('routes a search request and echoes the query', async () => {
  const route = createRouter(services())

  const response = await route(new Request('https://x.test/api/search?q=morty'))
  const body = await response.json()

  assertEquals(response.status, 200)
  assertEquals(body.query, 'morty')
})

Deno.test('answers 400 for a one-character search', async () => {
  const route = createRouter(services())

  const response = await route(new Request('https://x.test/api/search?q=m'))
  const body = await response.json()

  assertEquals(response.status, 400)
  assertEquals(body.error.code, 'INVALID_PARAMETER')
})

Deno.test('routes a dossier request', async () => {
  const route = createRouter(services())

  const response = await route(
    new Request('https://x.test/api/dossier', {
      method: 'POST',
      body: JSON.stringify({ entityId: 1, persona: 'morty' }),
    }),
  )
  const body = await response.json()

  assertEquals(response.status, 200)
  assertEquals(body.persona, 'morty')
  assertEquals(body.cached, false)
})

Deno.test('serves a stored dossier even when the allowance is gone', async () => {
  const route = createRouter({
    ...services(),
    // A store hit never calls `onGenerate`, so an exhausted allowance is
    // irrelevant to it: reading costs nothing, and only writing is rationed.
    dossier: {
      getDossier: async (
        entityType: string,
        entityId: number,
        persona: 'rick' | 'morty',
      ) => ({
        entityType,
        entityId,
        persona,
        text: 'On file.',
        model: 'grok-test',
        promptVersion: 1,
        cached: true,
      }),
    },
    quota: {
      check: async () => {
        throw new RateLimitError('out of fluid')
      },
    },
  })

  const response = await route(
    new Request('https://x.test/api/dossier', {
      method: 'POST',
      body: JSON.stringify({ entityId: 1 }),
    }),
  )
  const body = await response.json()

  assertEquals(response.status, 200)
  assertEquals(body.cached, true)
})

Deno.test('answers 400 for a dossier request with no id', async () => {
  const route = createRouter(services())

  const response = await route(
    new Request('https://x.test/api/dossier', { method: 'POST', body: '{}' }),
  )
  const body = await response.json()

  assertEquals(response.status, 400)
  assertEquals(body.error.code, 'INVALID_PARAMETER')
})

Deno.test('answers 429 when the dossier allowance is gone', async () => {
  const route = createRouter({
    ...services(),
    quota: {
      check: async () => {
        throw new RateLimitError('out of fluid')
      },
    },
  })

  const response = await route(
    new Request('https://x.test/api/dossier', {
      method: 'POST',
      body: JSON.stringify({ entityId: 1 }),
    }),
  )
  const body = await response.json()

  assertEquals(response.status, 429)
  assertEquals(body.error.code, 'RATE_LIMITED')
})

Deno.test('still answers 404 for an unknown POST path', async () => {
  const route = createRouter(services())

  const response = await route(
    new Request('https://x.test/api/nonsense', { method: 'POST', body: '{}' }),
  )

  assertEquals(response.status, 404)
})

async function readSse(response: Response): Promise<string> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let out = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    out += decoder.decode(value, { stream: true })
  }
  return out
}

Deno.test('streams an ask response as Server-Sent Events', async () => {
  const route = createRouter({
    ...services(),
    ask: {
      ask: async function* () {
        yield {
          type: 'sources' as const,
          sources: [{ type: 'character' as const, id: 1, name: 'Rick Sanchez' }],
          citable: [{ type: 'character' as const, id: 1, name: 'Rick Sanchez' }],
        }
        yield { type: 'token' as const, text: 'Wubba' }
      },
    },
  })

  const response = await route(
    new Request('https://x.test/api/ask', {
      method: 'POST',
      body: JSON.stringify({ q: 'who is Rick?' }),
    }),
  )
  const text = await readSse(response)

  assertEquals(response.status, 200)
  assertEquals(response.headers.get('content-type'), 'text/event-stream')
  assertEquals(text.includes('event: sources'), true)
  assertEquals(text.includes('"name":"Rick Sanchez"'), true)
  assertEquals(text.includes('event: token'), true)
  assertEquals(text.includes('"text":"Wubba"'), true)
})

Deno.test('answers 400 as JSON for a two-character question', async () => {
  const route = createRouter(services())

  const response = await route(
    new Request('https://x.test/api/ask', {
      method: 'POST',
      body: JSON.stringify({ q: 'hi' }),
    }),
  )
  const body = await response.json()

  assertEquals(response.status, 400)
  assertEquals(body.error.code, 'INVALID_PARAMETER')
})

Deno.test('answers 429 as JSON when the ask allowance is gone', async () => {
  const route = createRouter({
    ...services(),
    quota: {
      check: async () => {
        throw new RateLimitError('out of fluid')
      },
    },
  })

  const response = await route(
    new Request('https://x.test/api/ask', {
      method: 'POST',
      body: JSON.stringify({ q: 'who is Rick?' }),
    }),
  )
  const body = await response.json()

  assertEquals(response.status, 429)
  assertEquals(body.error.code, 'RATE_LIMITED')
})

Deno.test('turns a mid-stream provider failure into an error event', async () => {
  const route = createRouter({
    ...services(),
    ask: {
      ask: async function* () {
        yield { type: 'token' as const, text: 'Wub' }
        throw new AiError('Grok returned 500')
      },
    },
  })

  const response = await route(
    new Request('https://x.test/api/ask', {
      method: 'POST',
      body: JSON.stringify({ q: 'who is Rick?' }),
    }),
  )
  const text = await readSse(response)

  // The status was already sent as 200; the failure has to travel in-band.
  assertEquals(response.status, 200)
  assertEquals(text.includes('event: error'), true)
  assertEquals(text.includes('AI_UNAVAILABLE'), true)
})
