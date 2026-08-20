import { assertEquals } from 'jsr:@std/assert'
import { createSearchService } from '../services/search.ts'
import type { CharacterQuery, EpisodeQuery, LocationQuery } from '../types.ts'

const passthroughCache = {
  resolve: async <T>(_key: string, _ttl: number, load: () => Promise<T>) => ({
    payload: await load(),
    stale: false,
  }),
}

function rawCharacter(id: number, name: string) {
  return {
    id,
    name,
    status: 'Alive',
    species: 'Human',
    type: '',
    gender: 'Male',
    image: `https://example.test/${id}.jpeg`,
    origin: { name: 'Earth (C-137)', url: 'https://rickandmortyapi.com/api/location/1' },
    location: { name: 'Citadel of Ricks', url: 'https://rickandmortyapi.com/api/location/3' },
    episode: ['https://rickandmortyapi.com/api/episode/1'],
  }
}

function rawLocation(id: number, name: string) {
  return { id, name, type: 'Planet', dimension: 'Dimension C-137', residents: [] }
}

function rawEpisode(id: number, name: string) {
  return {
    id,
    name,
    air_date: 'December 2, 2013',
    episode: 'S01E01',
    characters: ['https://rickandmortyapi.com/api/character/1'],
  }
}

function stubClient() {
  const queries: { characters: CharacterQuery[]; locations: LocationQuery[]; episodes: EpisodeQuery[] } = {
    characters: [],
    locations: [],
    episodes: [],
  }

  return {
    queries,
    client: {
      listCharacters: async (query: CharacterQuery) => {
        queries.characters.push(query)
        return {
          info: { count: 116, pages: 6 },
          results: Array.from({ length: 25 }, (_, i) => rawCharacter(i + 1, `Morty ${i + 1}`)),
        }
      },
      listLocations: async (query: LocationQuery) => {
        queries.locations.push(query)
        return { info: { count: 1, pages: 1 }, results: [rawLocation(3, 'Morty Town')] }
      },
      listEpisodes: async (query: EpisodeQuery) => {
        queries.episodes.push(query)
        return { info: { count: 0, pages: 0 }, results: [] }
      },
    },
  }
}

Deno.test('queries all three entity types by name', async () => {
  const { client, queries } = stubClient()
  const service = createSearchService(client, passthroughCache)

  await service.search('morty')

  assertEquals(queries.characters, [{ page: 1, name: 'morty' }])
  assertEquals(queries.locations, [{ page: 1, name: 'morty' }])
  assertEquals(queries.episodes, [{ page: 1, name: 'morty' }])
})

Deno.test('groups the results by type and reports the upstream total', async () => {
  const { client } = stubClient()
  const service = createSearchService(client, passthroughCache)

  const { payload } = await service.search('morty')

  assertEquals(payload.query, 'morty')
  assertEquals(payload.groups.characters.total, 116)
  assertEquals(payload.groups.characters.items[0].name, 'Morty 1')
  assertEquals(payload.groups.locations.total, 1)
  assertEquals(payload.groups.locations.items[0].name, 'Morty Town')
})

Deno.test('caps each group at twenty items regardless of the page size', async () => {
  const { client } = stubClient()
  const service = createSearchService(client, passthroughCache)

  const { payload } = await service.search('morty')

  assertEquals(payload.groups.characters.items.length, 20)
})

Deno.test('treats an empty group as an ordinary outcome', async () => {
  const { client } = stubClient()
  const service = createSearchService(client, passthroughCache)

  const { payload } = await service.search('morty')

  assertEquals(payload.groups.episodes.items, [])
  assertEquals(payload.groups.episodes.total, 0)
})

Deno.test('caches under one lowercased key for a full day', async () => {
  const keys: string[] = []
  let seenTtl = 0
  const recordingCache = {
    resolve: async <T>(key: string, ttl: number, load: () => Promise<T>) => {
      keys.push(key)
      seenTtl = ttl
      return { payload: await load(), stale: false }
    },
  }
  const { client } = stubClient()
  const service = createSearchService(client, recordingCache)

  await service.search('MoRtY')

  assertEquals(keys, ['search?q=morty'])
  assertEquals(seenTtl, 24 * 60 * 60)
})
