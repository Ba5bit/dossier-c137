import { assertEquals } from 'jsr:@std/assert'
import { createStatsService } from '../services/stats.ts'
import type { CharacterQuery } from '../types.ts'

const passthroughCache = {
  resolve: async <T>(_key: string, _ttl: number, load: () => Promise<T>) => ({
    payload: await load(),
    stale: false,
  }),
}

function listResponse(count: number, pages: number) {
  return { info: { count, pages }, results: [] }
}

function stubClient() {
  const characterQueries: CharacterQuery[] = []
  return {
    characterQueries,
    client: {
      listCharacters: async (query: CharacterQuery) => {
        characterQueries.push(query)
        if (query.name === 'rick') return listResponse(112, 6)
        if (query.name === 'morty') return listResponse(53, 3)
        return listResponse(826, 42)
      },
      listLocations: async () => listResponse(126, 7),
      listEpisodes: async () => listResponse(51, 3),
    },
  }
}

Deno.test('reports a total and a page count for every entity type', async () => {
  const { client } = stubClient()
  const service = createStatsService(client, passthroughCache)

  const result = await service.getStats()

  assertEquals(result.payload.characters, { total: 826, pages: 42 })
  assertEquals(result.payload.locations, { total: 126, pages: 7 })
  assertEquals(result.payload.episodes, { total: 51, pages: 3 })
})

Deno.test('counts the Ricks and the Mortys by name', async () => {
  const { client } = stubClient()
  const service = createStatsService(client, passthroughCache)

  const result = await service.getStats()

  assertEquals(result.payload.ricks, 112)
  assertEquals(result.payload.mortys, 53)
})

Deno.test('derives every number from an upstream response', async () => {
  const { client, characterQueries } = stubClient()
  const service = createStatsService(client, passthroughCache)

  await service.getStats()

  // Three character queries: the whole roster, the Ricks, and the Mortys.
  assertEquals(characterQueries.length, 3)
  assertEquals(characterQueries[0], { page: 1 })
  assertEquals(characterQueries[1], { page: 1, name: 'rick' })
  assertEquals(characterQueries[2], { page: 1, name: 'morty' })
})

Deno.test('caches the whole aggregate under a single key', async () => {
  const keys: string[] = []
  const recordingCache = {
    resolve: async <T>(key: string, _ttl: number, load: () => Promise<T>) => {
      keys.push(key)
      return { payload: await load(), stale: false }
    },
  }
  const { client } = stubClient()
  const service = createStatsService(client, recordingCache)

  await service.getStats()

  assertEquals(keys, ['stats'])
})

Deno.test('caches the aggregate for a full day', async () => {
  let seenTtl = 0
  const recordingCache = {
    resolve: async <T>(_key: string, ttl: number, load: () => Promise<T>) => {
      seenTtl = ttl
      return { payload: await load(), stale: false }
    },
  }
  const { client } = stubClient()
  const service = createStatsService(client, recordingCache)

  await service.getStats()

  assertEquals(seenTtl, 24 * 60 * 60)
})
