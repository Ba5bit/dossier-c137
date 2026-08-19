import { createClient } from 'jsr:@supabase/supabase-js@2'

export type CacheRow = {
  payload: unknown
  expiresAt: number
}

export type CacheStore = {
  read(key: string): Promise<CacheRow | null>
  write(key: string, payload: unknown, expiresAt: number): Promise<void>
}

export type Resolved<T> = {
  payload: T
  stale: boolean
}

/**
 * Parameters are sorted so that the same logical query always produces the
 * same key. Without sorting, reordered parameters would create duplicate
 * entries for identical requests.
 */
export function buildCacheKey(
  prefix: string,
  params: Record<string, string | undefined>,
): string {
  const search = new URLSearchParams()
  for (const key of Object.keys(params).sort()) {
    const value = params[key]
    if (value !== undefined) search.set(key, value)
  }
  const query = search.toString()
  return query ? `${prefix}?${query}` : prefix
}

export function createCache(store: CacheStore, now: () => number = Date.now) {
  async function resolve<T>(
    key: string,
    ttlSeconds: number,
    load: () => Promise<T>,
  ): Promise<Resolved<T>> {
    const existing = await store.read(key)

    if (existing && existing.expiresAt > now()) {
      return { payload: existing.payload as T, stale: false }
    }

    try {
      const fresh = await load()
      await store.write(key, fresh, now() + ttlSeconds * 1_000)
      return { payload: fresh, stale: false }
    } catch (error) {
      // Stale data beats an empty screen when the upstream is unreachable.
      if (existing) {
        return { payload: existing.payload as T, stale: true }
      }
      throw error
    }
  }

  return { resolve }
}

export function createPostgresStore(url: string, serviceKey: string): CacheStore {
  const db = createClient(url, serviceKey)

  return {
    async read(key) {
      const { data, error } = await db
        .from('cache_entries')
        .select('payload, expires_at')
        .eq('key', key)
        .maybeSingle()

      if (error || !data) return null

      return {
        payload: data.payload,
        expiresAt: new Date(data.expires_at).getTime(),
      }
    },

    async write(key, payload, expiresAt) {
      await db.from('cache_entries').upsert({
        key,
        payload,
        expires_at: new Date(expiresAt).toISOString(),
      })
    },
  }
}
