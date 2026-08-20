import { assertEquals } from 'jsr:@std/assert'
import { createLocationService } from '../services/locations.ts'
import type { RawCharacter, RawLocation } from '../clients/rmClient.ts'

function rawLocation(overrides: Partial<RawLocation> = {}): RawLocation {
  return {
    id: 1,
    name: 'Earth (C-137)',
    type: 'Planet',
    dimension: 'Dimension C-137',
    residents: [
      'https://rickandmortyapi.com/api/character/38',
      'https://rickandmortyapi.com/api/character/45',
    ],
    ...overrides,
  }
}

function rawResident(id: number, name: string): RawCharacter {
  return {
    id,
    name,
    status: 'Alive',
    species: 'Human',
    type: '',
    gender: 'Male',
    image: `https://example.test/${id}.jpeg`,
    origin: { name: 'unknown', url: '' },
    location: { name: 'Earth (C-137)', url: 'https://rickandmortyapi.com/api/location/1' },
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
  list: { info: { count: number; pages: number }; results: RawLocation[] },
  location: RawLocation = rawLocation(),
  residents: RawCharacter[] = [],
) {
  const batches: number[][] = []
  return {
    client: {
      listLocations: async () => list,
      getLocation: async () => location,
      getCharactersByIds: async (ids: number[]) => {
        batches.push(ids)
        return residents
      },
    },
    batches,
  }
}

Deno.test('shapes a location list with its resident counts', async () => {
  const { client } = stubClient({
    info: { count: 126, pages: 7 },
    results: [rawLocation()],
  })
  const service = createLocationService(client, passthroughCache)

  const result = await service.listLocations({ page: 1 })

  assertEquals(result.payload.items[0], {
    id: 1,
    name: 'Earth (C-137)',
    type: 'Planet',
    dimension: 'Dimension C-137',
    residentCount: 2,
  })
  assertEquals(result.payload.pagination, {
    page: 1,
    pageCount: 7,
    total: 126,
    pageSize: 20,
  })
})

Deno.test('expands a location with its resident roster', async () => {
  const { client } = stubClient(
    { info: { count: 0, pages: 0 }, results: [] },
    rawLocation(),
    [rawResident(38, 'Beth Smith'), rawResident(45, 'Bruce Chutback')],
  )
  const service = createLocationService(client, passthroughCache)

  const result = await service.getLocation(1)

  assertEquals(result.payload.location.name, 'Earth (C-137)')
  assertEquals(result.payload.residents, [
    { id: 38, name: 'Beth Smith', status: 'Alive', image: 'https://example.test/38.jpeg' },
    { id: 45, name: 'Bruce Chutback', status: 'Alive', image: 'https://example.test/45.jpeg' },
  ])
})

Deno.test('asks for every resident in a single batch', async () => {
  const { client, batches } = stubClient(
    { info: { count: 0, pages: 0 }, results: [] },
    rawLocation(),
  )
  const service = createLocationService(client, passthroughCache)

  await service.getLocation(1)

  assertEquals(batches, [[38, 45]])
})

Deno.test('handles a location with no residents at all', async () => {
  const { client } = stubClient(
    { info: { count: 0, pages: 0 }, results: [] },
    rawLocation({ residents: [] }),
  )
  const service = createLocationService(client, passthroughCache)

  const result = await service.getLocation(1)

  assertEquals(result.payload.residents, [])
  assertEquals(result.payload.location.residentCount, 0)
})

Deno.test('caches a location list under a sorted key', async () => {
  const keys: string[] = []
  const recordingCache = {
    resolve: async <T>(key: string, _ttl: number, load: () => Promise<T>) => {
      keys.push(key)
      return { payload: await load(), stale: false }
    },
  }
  const { client } = stubClient({ info: { count: 0, pages: 0 }, results: [] })
  const service = createLocationService(client, recordingCache)

  await service.listLocations({ page: 2, dimension: 'C-137', name: 'earth' })

  assertEquals(keys, ['locations?dimension=C-137&name=earth&page=2'])
})

Deno.test('caches a location detail under its own key', async () => {
  const keys: string[] = []
  const recordingCache = {
    resolve: async <T>(key: string, _ttl: number, load: () => Promise<T>) => {
      keys.push(key)
      return { payload: await load(), stale: false }
    },
  }
  const { client } = stubClient(
    { info: { count: 0, pages: 0 }, results: [] },
    rawLocation({ residents: [] }),
  )
  const service = createLocationService(client, recordingCache)

  await service.getLocation(3)

  assertEquals(keys, ['location/3'])
})
