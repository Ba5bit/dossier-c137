import { buildCacheKey, type Resolved } from '../lib/cache.ts'
import { PAGE_SIZE, TTL_SECONDS, toRef } from './refs.ts'
import type { RawCharacter, RmListResponse } from '../clients/rmClient.ts'
import type { Character, CharacterQuery, ListResponse } from '../types.ts'

type CharacterClient = {
  listCharacters(query: CharacterQuery): Promise<RmListResponse<RawCharacter>>
}

type CacheLike = {
  resolve<T>(
    key: string,
    ttlSeconds: number,
    load: () => Promise<T>,
  ): Promise<Resolved<T>>
}

export function toCharacter(raw: RawCharacter): Character {
  return {
    id: raw.id,
    name: raw.name,
    status: raw.status,
    species: raw.species,
    type: raw.type,
    gender: raw.gender,
    image: raw.image,
    origin: toRef(raw.origin),
    location: toRef(raw.location),
    episodeCount: raw.episode.length,
  }
}

export function createCharacterService(client: CharacterClient, cache: CacheLike) {
  async function listCharacters(
    query: CharacterQuery,
  ): Promise<Resolved<ListResponse<Character>>> {
    const key = buildCacheKey('characters', {
      page: String(query.page),
      name: query.name,
      status: query.status,
      species: query.species,
      gender: query.gender,
    })

    return await cache.resolve(key, TTL_SECONDS, async () => {
      const raw = await client.listCharacters(query)
      return {
        items: raw.results.map(toCharacter),
        pagination: {
          page: query.page,
          pageCount: raw.info.pages,
          total: raw.info.count,
          pageSize: PAGE_SIZE,
        },
      }
    })
  }

  return { listCharacters }
}
