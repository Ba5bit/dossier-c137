import { buildCacheKey, type Resolved } from '../lib/cache.ts'
import type { RawCharacter, RmListResponse } from '../clients/rmClient.ts'
import type {
  Character,
  CharacterQuery,
  CharacterRef,
  ListResponse,
} from '../types.ts'

const PAGE_SIZE = 20
const TTL_SECONDS = 24 * 60 * 60

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

/**
 * Relations arrive as URLs ending in a numeric id, or as an empty string
 * when the entity has no record — `origin: "unknown"` is common enough that
 * half of any given page carries it.
 */
function toRef(relation: { name: string; url: string }): CharacterRef {
  const match = relation.url.match(/\/(\d+)$/)
  return { name: relation.name, id: match ? Number(match[1]) : null }
}

function toCharacter(raw: RawCharacter): Character {
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

export function createRickMortyService(client: CharacterClient, cache: CacheLike) {
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
