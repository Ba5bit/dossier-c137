import { assertEquals } from 'jsr:@std/assert'
import { buildCacheKey, createCache, type CacheStore } from '../lib/cache.ts'

function memoryStore(): CacheStore & { writes: number } {
  const rows = new Map<string, { payload: unknown; expiresAt: number }>()
  return {
    writes: 0,
    async read(key) {
      return rows.get(key) ?? null
    },
    async write(key, payload, expiresAt) {
      this.writes++
      rows.set(key, { payload, expiresAt })
    },
  }
}

Deno.test('sorts parameters so equivalent queries share one key', () => {
  const a = buildCacheKey('characters', { status: 'alive', page: '2' })
  const b = buildCacheKey('characters', { page: '2', status: 'alive' })
  assertEquals(a, b)
  assertEquals(a, 'characters?page=2&status=alive')
})

Deno.test('omits undefined parameters from the key', () => {
  const key = buildCacheKey('characters', { page: '1', name: undefined })
  assertEquals(key, 'characters?page=1')
})

Deno.test('calls the loader and stores the result on a miss', async () => {
  const store = memoryStore()
  const cache = createCache(store, () => 1_000)

  const result = await cache.resolve('k', 60, async () => ({ value: 42 }))

  assertEquals(result.payload, { value: 42 })
  assertEquals(result.stale, false)
  assertEquals(store.writes, 1)
})

Deno.test('returns the stored payload without calling the loader on a hit', async () => {
  const store = memoryStore()
  const cache = createCache(store, () => 1_000)
  await cache.resolve('k', 60, async () => ({ value: 1 }))

  let called = false
  const result = await cache.resolve('k', 60, async () => {
    called = true
    return { value: 2 }
  })

  assertEquals(called, false)
  assertEquals(result.payload, { value: 1 })
  assertEquals(store.writes, 1)
})

Deno.test('refreshes an expired entry', async () => {
  const store = memoryStore()
  let now = 1_000
  const cache = createCache(store, () => now)
  await cache.resolve('k', 60, async () => ({ value: 1 }))

  now = 100_000
  const result = await cache.resolve('k', 60, async () => ({ value: 2 }))

  assertEquals(result.payload, { value: 2 })
  assertEquals(result.stale, false)
})

Deno.test('serves an expired entry marked stale when the loader fails', async () => {
  const store = memoryStore()
  let now = 1_000
  const cache = createCache(store, () => now)
  await cache.resolve('k', 60, async () => ({ value: 1 }))

  now = 100_000
  const result = await cache.resolve('k', 60, async () => {
    throw new Error('upstream down')
  })

  assertEquals(result.payload, { value: 1 })
  assertEquals(result.stale, true)
})
