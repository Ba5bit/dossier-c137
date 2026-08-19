import { assertEquals } from 'jsr:@std/assert'
import { createRickMortyService } from '../services/rickMorty.ts'
import type { RawCharacter, RmListResponse } from '../clients/rmClient.ts'

function rawCharacter(overrides: Partial<RawCharacter> = {}): RawCharacter {
  return {
    id: 1,
    name: 'Rick Sanchez',
    status: 'Alive',
    species: 'Human',
    type: '',
    gender: 'Male',
    image: 'https://example.test/1.jpeg',
    origin: {
      name: 'Earth (C-137)',
      url: 'https://rickandmortyapi.com/api/location/1',
    },
    location: {
      name: 'Citadel of Ricks',
      url: 'https://rickandmortyapi.com/api/location/3',
    },
    episode: [
      'https://rickandmortyapi.com/api/episode/1',
      'https://rickandmortyapi.com/api/episode/2',
    ],
    ...overrides,
  }
}

function stubClient(response: RmListResponse<RawCharacter>) {
  return {
    listCharacters: async () => response,
  }
}

const passthroughCache = {
  resolve: async <T>(_key: string, _ttl: number, load: () => Promise<T>) => ({
    payload: await load(),
    stale: false,
  }),
}

Deno.test('extracts the numeric id from a relation URL', async () => {
  const service = createRickMortyService(
    stubClient({ info: { count: 1, pages: 1 }, results: [rawCharacter()] }),
    passthroughCache,
  )

  const result = await service.listCharacters({ page: 1 })

  assertEquals(result.payload.items[0].origin, { name: 'Earth (C-137)', id: 1 })
  assertEquals(result.payload.items[0].location, { name: 'Citadel of Ricks', id: 3 })
})

Deno.test('marks a relation without a URL as unresolvable', async () => {
  const service = createRickMortyService(
    stubClient({
      info: { count: 1, pages: 1 },
      results: [rawCharacter({ origin: { name: 'unknown', url: '' } })],
    }),
    passthroughCache,
  )

  const result = await service.listCharacters({ page: 1 })

  assertEquals(result.payload.items[0].origin, { name: 'unknown', id: null })
})

Deno.test('counts episodes rather than passing URLs through', async () => {
  const service = createRickMortyService(
    stubClient({ info: { count: 1, pages: 1 }, results: [rawCharacter()] }),
    passthroughCache,
  )

  const result = await service.listCharacters({ page: 1 })

  assertEquals(result.payload.items[0].episodeCount, 2)
})

Deno.test('takes pagination totals from the upstream info block', async () => {
  const service = createRickMortyService(
    stubClient({ info: { count: 826, pages: 42 }, results: [] }),
    passthroughCache,
  )

  const result = await service.listCharacters({ page: 3 })

  assertEquals(result.payload.pagination, {
    page: 3,
    pageCount: 42,
    total: 826,
    pageSize: 20,
  })
})

Deno.test('builds a cache key covering every supplied filter', async () => {
  let seenKey = ''
  const recordingCache = {
    resolve: async <T>(key: string, _ttl: number, load: () => Promise<T>) => {
      seenKey = key
      return { payload: await load(), stale: false }
    },
  }

  const service = createRickMortyService(
    stubClient({ info: { count: 0, pages: 0 }, results: [] }),
    recordingCache,
  )

  await service.listCharacters({ page: 2, status: 'alive', name: 'rick' })

  assertEquals(seenKey, 'characters?name=rick&page=2&status=alive')
})
