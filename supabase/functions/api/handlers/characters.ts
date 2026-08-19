import { parseCharacterQuery } from '../lib/validate.ts'
import type { Resolved } from '../lib/cache.ts'
import type { Character, CharacterQuery, ListResponse } from '../types.ts'

export type CharacterService = {
  listCharacters(
    query: CharacterQuery,
  ): Promise<Resolved<ListResponse<Character>>>
}

export async function handleListCharacters(
  url: URL,
  service: CharacterService,
): Promise<{ body: ListResponse<Character>; stale: boolean }> {
  const query = parseCharacterQuery(url.searchParams)
  const result = await service.listCharacters(query)
  return { body: result.payload, stale: result.stale }
}
