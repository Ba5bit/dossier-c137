import { buildCacheKey, type Resolved } from '../lib/cache.ts'
import { PAGE_SIZE, TTL_SECONDS, idsFromUrls, toRef, toRelationRef } from './refs.ts'
import type { RawCharacter, RawEpisode, RmListResponse } from '../clients/rmClient.ts'
import type {
  Character,
  CharacterDetail,
  CharacterQuery,
  ListResponse,
} from '../types.ts'

type CharacterClient = {
  listCharacters(query: CharacterQuery): Promise<RmListResponse<RawCharacter>>
  getCharacter(id: number): Promise<RawCharacter>
  getEpisodesByIds(ids: number[]): Promise<RawEpisode[]>
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

  async function getCharacter(id: number): Promise<Resolved<CharacterDetail>> {
    // A detail request carries no parameters, so the path alone is the key.
    return await cache.resolve(`character/${id}`, TTL_SECONDS, async () => {
      const raw = await client.getCharacter(id)
      const episodes = await client.getEpisodesByIds(idsFromUrls(raw.episode))

      return {
        character: toCharacter(raw),
        origin: toRelationRef(raw.origin),
        location: toRelationRef(raw.location),
        episodes: episodes.map((episode) => ({
          id: episode.id,
          name: episode.name,
          episode: episode.episode,
        })),
      }
    })
  }

  return { listCharacters, getCharacter }
}
