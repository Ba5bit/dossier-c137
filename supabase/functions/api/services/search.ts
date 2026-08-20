import { buildCacheKey, type Resolved } from '../lib/cache.ts'
import { TTL_SECONDS } from './refs.ts'
import { toCharacter } from './characters.ts'
import { toLocation } from './locations.ts'
import { toEpisode } from './episodes.ts'
import type {
  RawCharacter,
  RawEpisode,
  RawLocation,
  RmListResponse,
} from '../clients/rmClient.ts'
import type {
  CharacterQuery,
  EpisodeQuery,
  LocationQuery,
  SearchResponse,
} from '../types.ts'

/**
 * The upstream page is twenty; the cap is stated here anyway so that a change
 * upstream cannot quietly widen the payload the browser downloads.
 */
export const SEARCH_LIMIT = 20

type SearchClient = {
  listCharacters(query: CharacterQuery): Promise<RmListResponse<RawCharacter>>
  listLocations(query: LocationQuery): Promise<RmListResponse<RawLocation>>
  listEpisodes(query: EpisodeQuery): Promise<RmListResponse<RawEpisode>>
}

type CacheLike = {
  resolve<T>(
    key: string,
    ttlSeconds: number,
    load: () => Promise<T>,
  ): Promise<Resolved<T>>
}

export function createSearchService(client: SearchClient, cache: CacheLike) {
  async function search(query: string): Promise<Resolved<SearchResponse>> {
    // "Morty" and "morty" are one query as far as the upstream is concerned,
    // so they must be one cache entry too.
    const key = buildCacheKey('search', { q: query.toLowerCase() })

    return await cache.resolve(key, TTL_SECONDS, async () => {
      // A 404 from the upstream means "nothing matched", and rmClient has
      // already normalized it into an empty result set.
      const [characters, locations, episodes] = await Promise.all([
        client.listCharacters({ page: 1, name: query }),
        client.listLocations({ page: 1, name: query }),
        client.listEpisodes({ page: 1, name: query }),
      ])

      return {
        query,
        groups: {
          characters: {
            items: characters.results.slice(0, SEARCH_LIMIT).map(toCharacter),
            total: characters.info.count,
          },
          locations: {
            items: locations.results.slice(0, SEARCH_LIMIT).map(toLocation),
            total: locations.info.count,
          },
          episodes: {
            items: episodes.results.slice(0, SEARCH_LIMIT).map(toEpisode),
            total: episodes.info.count,
          },
        },
      }
    })
  }

  return { search }
}

export type SearchService = ReturnType<typeof createSearchService>
