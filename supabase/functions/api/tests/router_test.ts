import { assertEquals } from 'jsr:@std/assert'
import { normalizePath, createRouter } from '../router.ts'
import { NotFoundError } from '../lib/errors.ts'

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
