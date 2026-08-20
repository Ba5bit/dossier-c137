import { TTL_SECONDS } from './refs.ts'
import type { Resolved } from '../lib/cache.ts'
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
  Stats,
} from '../types.ts'

type StatsClient = {
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

export function createStatsService(client: StatsClient, cache: CacheLike) {
  async function getStats(): Promise<Resolved<Stats>> {
    // The aggregate takes no parameters, so the prefix alone is the key.
    return await cache.resolve('stats', TTL_SECONDS, async () => {
      // Every figure comes from an upstream `info` block. Nothing here is a
      // constant, which is what spec section 6.2 asks for.
      const [characters, locations, episodes, ricks, mortys] = await Promise.all([
        client.listCharacters({ page: 1 }),
        client.listLocations({ page: 1 }),
        client.listEpisodes({ page: 1 }),
        client.listCharacters({ page: 1, name: 'rick' }),
        client.listCharacters({ page: 1, name: 'morty' }),
      ])

      return {
        characters: { total: characters.info.count, pages: characters.info.pages },
        locations: { total: locations.info.count, pages: locations.info.pages },
        episodes: { total: episodes.info.count, pages: episodes.info.pages },
        ricks: ricks.info.count,
        mortys: mortys.info.count,
      }
    })
  }

  return { getStats }
}
