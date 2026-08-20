import { parseSearchQuery } from '../lib/validate.ts'
import type { Resolved } from '../lib/cache.ts'
import type { SearchResponse } from '../types.ts'

export type SearchService = {
  search(query: string): Promise<Resolved<SearchResponse>>
}

export async function handleSearch(
  url: URL,
  service: SearchService,
): Promise<{ body: SearchResponse; stale: boolean }> {
  const result = await service.search(parseSearchQuery(url.searchParams))
  return { body: result.payload, stale: result.stale }
}
