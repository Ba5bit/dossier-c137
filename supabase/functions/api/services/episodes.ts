import { buildCacheKey, type Resolved } from '../lib/cache.ts'
import { PAGE_SIZE, TTL_SECONDS, idsFromUrls } from './refs.ts'
import { toSummary } from './locations.ts'
import type { RawCharacter, RawEpisode, RmListResponse } from '../clients/rmClient.ts'
import type {
  Episode,
  EpisodeDetail,
  EpisodeQuery,
  ListResponse,
} from '../types.ts'

type EpisodeClient = {
  listEpisodes(query: EpisodeQuery): Promise<RmListResponse<RawEpisode>>
  getEpisode(id: number): Promise<RawEpisode>
  getCharactersByIds(ids: number[]): Promise<RawCharacter[]>
}

type CacheLike = {
  resolve<T>(
    key: string,
    ttlSeconds: number,
    load: () => Promise<T>,
  ): Promise<Resolved<T>>
}

function toEpisode(raw: RawEpisode): Episode {
  return {
    id: raw.id,
    name: raw.name,
    // The upstream field is snake_case; the contract with the frontend is not.
    airDate: raw.air_date,
    episode: raw.episode,
    characterCount: raw.characters.length,
  }
}

export function createEpisodeService(client: EpisodeClient, cache: CacheLike) {
  async function listEpisodes(
    query: EpisodeQuery,
  ): Promise<Resolved<ListResponse<Episode>>> {
    const key = buildCacheKey('episodes', {
      page: String(query.page),
      name: query.name,
      episode: query.episode,
    })

    return await cache.resolve(key, TTL_SECONDS, async () => {
      const raw = await client.listEpisodes(query)
      return {
        items: raw.results.map(toEpisode),
        pagination: {
          page: query.page,
          pageCount: raw.info.pages,
          total: raw.info.count,
          pageSize: PAGE_SIZE,
        },
      }
    })
  }

  async function getEpisode(id: number): Promise<Resolved<EpisodeDetail>> {
    return await cache.resolve(`episode/${id}`, TTL_SECONDS, async () => {
      const raw = await client.getEpisode(id)
      const characters = await client.getCharactersByIds(idsFromUrls(raw.characters))

      return {
        episode: toEpisode(raw),
        characters: characters.map(toSummary),
      }
    })
  }

  return { listEpisodes, getEpisode }
}
