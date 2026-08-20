import { parseId, parseLocationQuery } from '../lib/validate.ts'
import type { Resolved } from '../lib/cache.ts'
import type {
  ListResponse,
  Location,
  LocationDetail,
  LocationQuery,
} from '../types.ts'

export type LocationService = {
  listLocations(query: LocationQuery): Promise<Resolved<ListResponse<Location>>>
  getLocation(id: number): Promise<Resolved<LocationDetail>>
}

export async function handleListLocations(
  url: URL,
  service: LocationService,
): Promise<{ body: ListResponse<Location>; stale: boolean }> {
  const query = parseLocationQuery(url.searchParams)
  const result = await service.listLocations(query)
  return { body: result.payload, stale: result.stale }
}

export async function handleGetLocation(
  rawId: string,
  service: LocationService,
): Promise<{ body: LocationDetail; stale: boolean }> {
  const result = await service.getLocation(parseId(rawId))
  return { body: result.payload, stale: result.stale }
}
