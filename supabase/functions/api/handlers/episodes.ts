import { parseEpisodeQuery, parseId } from '../lib/validate.ts'
import type { Resolved } from '../lib/cache.ts'
import type {
  Episode,
  EpisodeDetail,
  EpisodeQuery,
  ListResponse,
} from '../types.ts'

export type EpisodeService = {
  listEpisodes(query: EpisodeQuery): Promise<Resolved<ListResponse<Episode>>>
  getEpisode(id: number): Promise<Resolved<EpisodeDetail>>
}

export async function handleListEpisodes(
  url: URL,
  service: EpisodeService,
): Promise<{ body: ListResponse<Episode>; stale: boolean }> {
  const query = parseEpisodeQuery(url.searchParams)
  const result = await service.listEpisodes(query)
  return { body: result.payload, stale: result.stale }
}

export async function handleGetEpisode(
  rawId: string,
  service: EpisodeService,
): Promise<{ body: EpisodeDetail; stale: boolean }> {
  const result = await service.getEpisode(parseId(rawId))
  return { body: result.payload, stale: result.stale }
}
