import { parseCharacterQuery, parseId } from '../lib/validate.ts'
import type { Resolved } from '../lib/cache.ts'
import type {
  Character,
  CharacterDetail,
  CharacterQuery,
  ListResponse,
} from '../types.ts'

export type CharacterService = {
  listCharacters(
    query: CharacterQuery,
  ): Promise<Resolved<ListResponse<Character>>>
  getCharacter(id: number): Promise<Resolved<CharacterDetail>>
}

export async function handleListCharacters(
  url: URL,
  service: CharacterService,
): Promise<{ body: ListResponse<Character>; stale: boolean }> {
  const query = parseCharacterQuery(url.searchParams)
  const result = await service.listCharacters(query)
  return { body: result.payload, stale: result.stale }
}

export async function handleGetCharacter(
  rawId: string,
  service: CharacterService,
): Promise<{ body: CharacterDetail; stale: boolean }> {
  const result = await service.getCharacter(parseId(rawId))
  return { body: result.payload, stale: result.stale }
}
