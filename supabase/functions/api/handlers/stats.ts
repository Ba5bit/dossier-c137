import type { Resolved } from '../lib/cache.ts'
import type { Stats } from '../types.ts'

export type StatsService = {
  getStats(): Promise<Resolved<Stats>>
}

export async function handleGetStats(
  service: StatsService,
): Promise<{ body: Stats; stale: boolean }> {
  const result = await service.getStats()
  return { body: result.payload, stale: result.stale }
}
