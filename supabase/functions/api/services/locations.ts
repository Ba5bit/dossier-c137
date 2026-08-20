import { buildCacheKey, type Resolved } from '../lib/cache.ts'
import { PAGE_SIZE, TTL_SECONDS, idsFromUrls } from './refs.ts'
import type { RawCharacter, RawLocation, RmListResponse } from '../clients/rmClient.ts'
import type {
  CharacterSummary,
  ListResponse,
  Location,
  LocationDetail,
  LocationQuery,
} from '../types.ts'

type LocationClient = {
  listLocations(query: LocationQuery): Promise<RmListResponse<RawLocation>>
  getLocation(id: number): Promise<RawLocation>
  getCharactersByIds(ids: number[]): Promise<RawCharacter[]>
}

type CacheLike = {
  resolve<T>(
    key: string,
    ttlSeconds: number,
    load: () => Promise<T>,
  ): Promise<Resolved<T>>
}

export function toLocation(raw: RawLocation): Location {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    dimension: raw.dimension,
    residentCount: raw.residents.length,
  }
}

export function toSummary(raw: RawCharacter): CharacterSummary {
  return { id: raw.id, name: raw.name, status: raw.status, image: raw.image }
}

export function createLocationService(client: LocationClient, cache: CacheLike) {
  async function listLocations(
    query: LocationQuery,
  ): Promise<Resolved<ListResponse<Location>>> {
    const key = buildCacheKey('locations', {
      page: String(query.page),
      name: query.name,
      type: query.type,
      dimension: query.dimension,
    })

    return await cache.resolve(key, TTL_SECONDS, async () => {
      const raw = await client.listLocations(query)
      return {
        items: raw.results.map(toLocation),
        pagination: {
          page: query.page,
          pageCount: raw.info.pages,
          total: raw.info.count,
          pageSize: PAGE_SIZE,
        },
      }
    })
  }

  async function getLocation(id: number): Promise<Resolved<LocationDetail>> {
    return await cache.resolve(`location/${id}`, TTL_SECONDS, async () => {
      const raw = await client.getLocation(id)
      const residents = await client.getCharactersByIds(idsFromUrls(raw.residents))

      return {
        location: toLocation(raw),
        residents: residents.map(toSummary),
      }
    })
  }

  return { listLocations, getLocation }
}
