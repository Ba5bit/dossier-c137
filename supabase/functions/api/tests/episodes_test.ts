import { assertEquals } from 'jsr:@std/assert'
import { createEpisodeService } from '../services/episodes.ts'
import type { RawCharacter, RawEpisode } from '../clients/rmClient.ts'

function rawEpisode(overrides: Partial<RawEpisode> = {}): RawEpisode {
  return {
    id: 1,
    name: 'Pilot',
    air_date: 'December 2, 2013',
    episode: 'S01E01',
    characters: [
      'https://rickandmortyapi.com/api/character/1',
      'https://rickandmortyapi.com/api/character/2',
    ],
    ...overrides,
  }
}

function rawCharacter(id: number, name: string): RawCharacter {
  return {
    id,
    name,
    status: 'Alive',
    species: 'Human',
    type: '',
    gender: 'Male',
    image: `https://example.test/${id}.jpeg`,
    origin: { name: 'unknown', url: '' },
    location: { name: 'unknown', url: '' },
    episode: [],
  }
}

const passthroughCache = {
  resolve: async <T>(_key: string, _ttl: number, load: () => Promise<T>) => ({
    payload: await load(),
    stale: false,
  }),
}

function stubClient(
  list: { info: { count: number; pages: number }; results: RawEpisode[] },
  episode: RawEpisode = rawEpisode(),
  characters: RawCharacter[] = [],
) {
  const batches: number[][] = []
  return {
    client: {
      listEpisodes: async () => list,
      getEpisode: async () => episode,
      getCharactersByIds: async (ids: number[]) => {
        batches.push(ids)
        return characters
      },
    },
    batches,
  }
}

Deno.test('renames air_date to airDate and counts the cast', async () => {
  const { client } = stubClient({ info: { count: 51, pages: 3 }, results: [rawEpisode()] })
  const service = createEpisodeService(client, passthroughCache)

  const result = await service.listEpisodes({ page: 1 })

  assertEquals(result.payload.items[0], {
    id: 1,
    name: 'Pilot',
    airDate: 'December 2, 2013',
    episode: 'S01E01',
    characterCount: 2,
  })
  assertEquals(result.payload.pagination.total, 51)
})

Deno.test('expands an episode with the characters present', async () => {
  const { client } = stubClient(
    { info: { count: 0, pages: 0 }, results: [] },
    rawEpisode(),
    [rawCharacter(1, 'Rick Sanchez'), rawCharacter(2, 'Morty Smith')],
  )
  const service = createEpisodeService(client, passthroughCache)

  const result = await service.getEpisode(1)

  assertEquals(result.payload.episode.episode, 'S01E01')
  assertEquals(result.payload.characters, [
    { id: 1, name: 'Rick Sanchez', status: 'Alive', image: 'https://example.test/1.jpeg' },
    { id: 2, name: 'Morty Smith', status: 'Alive', image: 'https://example.test/2.jpeg' },
  ])
})

Deno.test('asks for the whole cast in a single batch', async () => {
  const { client, batches } = stubClient(
    { info: { count: 0, pages: 0 }, results: [] },
    rawEpisode(),
  )
  const service = createEpisodeService(client, passthroughCache)

  await service.getEpisode(1)

  assertEquals(batches, [[1, 2]])
})

Deno.test('caches an episode detail under its own key', async () => {
  const keys: string[] = []
  const recordingCache = {
    resolve: async <T>(key: string, _ttl: number, load: () => Promise<T>) => {
      keys.push(key)
      return { payload: await load(), stale: false }
    },
  }
  const { client } = stubClient(
    { info: { count: 0, pages: 0 }, results: [] },
    rawEpisode({ characters: [] }),
  )
  const service = createEpisodeService(client, recordingCache)

  await service.getEpisode(5)

  assertEquals(keys, ['episode/5'])
})
