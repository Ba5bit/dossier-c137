import { assertEquals } from 'jsr:@std/assert'
import { createCharacterService } from '../services/characters.ts'
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
  // The list tests exercise only listCharacters; the detail methods are here
  // to satisfy the client contract, not to be called.
  return {
    listCharacters: async () => response,
    getCharacter: async () => rawCharacter(),
    getEpisodesByIds: async () => [],
  }
}

const passthroughCache = {
  resolve: async <T>(_key: string, _ttl: number, load: () => Promise<T>) => ({
    payload: await load(),
    stale: false,
  }),
}

Deno.test('extracts the numeric id from a relation URL', async () => {
  const service = createCharacterService(
    stubClient({ info: { count: 1, pages: 1 }, results: [rawCharacter()] }),
    passthroughCache,
  )

  const result = await service.listCharacters({ page: 1 })

  assertEquals(result.payload.items[0].origin, { name: 'Earth (C-137)', id: 1 })
  assertEquals(result.payload.items[0].location, { name: 'Citadel of Ricks', id: 3 })
})

Deno.test('marks a relation without a URL as unresolvable', async () => {
  const service = createCharacterService(
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
  const service = createCharacterService(
    stubClient({ info: { count: 1, pages: 1 }, results: [rawCharacter()] }),
    passthroughCache,
  )

  const result = await service.listCharacters({ page: 1 })

  assertEquals(result.payload.items[0].episodeCount, 2)
})

Deno.test('takes pagination totals from the upstream info block', async () => {
  const service = createCharacterService(
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

  const service = createCharacterService(
    stubClient({ info: { count: 0, pages: 0 }, results: [] }),
    recordingCache,
  )

  await service.listCharacters({ page: 2, status: 'alive', name: 'rick' })

  assertEquals(seenKey, 'characters?name=rick&page=2&status=alive')
})

function rawEpisode(id: number, name: string, code: string) {
  return {
    id,
    name,
    air_date: 'December 2, 2013',
    episode: code,
    characters: ['https://rickandmortyapi.com/api/character/1'],
  }
}

function stubDetailClient(
  character: RawCharacter,
  episodes: ReturnType<typeof rawEpisode>[] = [],
) {
  const seen: number[][] = []
  return {
    client: {
      listCharacters: async () => ({ info: { count: 0, pages: 0 }, results: [] }),
      getCharacter: async () => character,
      getEpisodesByIds: async (ids: number[]) => {
        seen.push(ids)
        return episodes
      },
    },
    seen,
  }
}

Deno.test('expands a character with its origin, location, and episodes', async () => {
  const { client } = stubDetailClient(rawCharacter(), [
    rawEpisode(1, 'Pilot', 'S01E01'),
    rawEpisode(2, 'Lawnmower Dog', 'S01E02'),
  ])
  const service = createCharacterService(client, passthroughCache)

  const result = await service.getCharacter(1)

  assertEquals(result.payload.character.name, 'Rick Sanchez')
  assertEquals(result.payload.origin, {
    id: 1,
    name: 'Earth (C-137)',
    resolved: true,
  })
  assertEquals(result.payload.location, {
    id: 3,
    name: 'Citadel of Ricks',
    resolved: true,
  })
  assertEquals(result.payload.episodes, [
    { id: 1, name: 'Pilot', episode: 'S01E01' },
    { id: 2, name: 'Lawnmower Dog', episode: 'S01E02' },
  ])
})

Deno.test('marks an unknown origin as unresolved on the detail response', async () => {
  const { client } = stubDetailClient(
    rawCharacter({ origin: { name: 'unknown', url: '' } }),
  )
  const service = createCharacterService(client, passthroughCache)

  const result = await service.getCharacter(1)

  assertEquals(result.payload.origin, { id: null, name: 'unknown', resolved: false })
})

Deno.test('asks for every episode in a single batch', async () => {
  const { client, seen } = stubDetailClient(rawCharacter())
  const service = createCharacterService(client, passthroughCache)

  await service.getCharacter(1)

  assertEquals(seen.length, 1)
  assertEquals(seen[0], [1, 2])
})

Deno.test('caches a character detail under its own key', async () => {
  const keys: string[] = []
  const recordingCache = {
    resolve: async <T>(key: string, _ttl: number, load: () => Promise<T>) => {
      keys.push(key)
      return { payload: await load(), stale: false }
    },
  }
  const { client } = stubDetailClient(rawCharacter())
  const service = createCharacterService(client, recordingCache)

  await service.getCharacter(7)

  assertEquals(keys, ['character/7'])
})
