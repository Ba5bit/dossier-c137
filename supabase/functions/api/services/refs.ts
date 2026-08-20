import type { CharacterRef, RelationRef } from '../types.ts'

export const PAGE_SIZE = 20
export const TTL_SECONDS = 24 * 60 * 60

/**
 * Relations arrive as URLs ending in a numeric id, or as an empty string
 * when the entity has no record — origin "unknown" is common enough that
 * half of any given page carries it.
 */
export function idFromUrl(url: string): number | null {
  const match = url.match(/\/(\d+)$/)
  return match ? Number(match[1]) : null
}

export function toRef(relation: { name: string; url: string }): CharacterRef {
  return { name: relation.name, id: idFromUrl(relation.url) }
}

export function toRelationRef(relation: { name: string; url: string }): RelationRef {
  const id = idFromUrl(relation.url)
  return { id, name: relation.name, resolved: id !== null }
}

export function idsFromUrls(urls: string[]): number[] {
  return urls.map(idFromUrl).filter((id): id is number => id !== null)
}
