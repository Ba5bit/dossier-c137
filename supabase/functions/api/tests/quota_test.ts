import { assertEquals, assertNotEquals, assertRejects } from 'jsr:@std/assert'
import {
  ASK_DAILY_LIMIT,
  clientIp,
  createQuota,
  DOSSIER_DAILY_LIMIT,
  GLOBAL_DAILY_LIMIT,
  GLOBAL_KEY,
  hashIp,
} from '../lib/quota.ts'
import { RateLimitError } from '../lib/errors.ts'

function requestFrom(ip: string | null) {
  const headers = new Headers()
  if (ip !== null) headers.set('x-forwarded-for', ip)
  return new Request('https://x.test/api/ask', { method: 'POST', headers })
}

function countingStore(counts: Record<string, number> = {}) {
  const calls: { ipHash: string; endpoint: string }[] = []
  return {
    calls,
    store: {
      bump: async (ipHash: string, endpoint: string) => {
        calls.push({ ipHash, endpoint })
        const key = `${ipHash}:${endpoint}`
        counts[key] = (counts[key] ?? 0) + 1
        return counts[key]
      },
    },
  }
}

Deno.test('reads the first address of a forwarded chain', () => {
  assertEquals(clientIp(requestFrom('203.0.113.9, 70.41.3.18')), '203.0.113.9')
})

Deno.test('falls back to a constant when no address is forwarded', () => {
  assertEquals(clientIp(requestFrom(null)), 'unknown')
})

Deno.test('hashes an address rather than storing it', async () => {
  const hash = await hashIp('203.0.113.9', 'salt')

  assertEquals(hash.length, 64)
  assertNotEquals(hash.includes('203.0.113.9'), true)
})

Deno.test('the same address and salt always hash the same', async () => {
  assertEquals(await hashIp('203.0.113.9', 's'), await hashIp('203.0.113.9', 's'))
})

Deno.test('a different salt gives a different digest', async () => {
  assertNotEquals(await hashIp('203.0.113.9', 'a'), await hashIp('203.0.113.9', 'b'))
})

Deno.test('counts the caller and the application on every allowed call', async () => {
  const { store, calls } = countingStore()
  const quota = createQuota(store, 'salt')

  await quota.check(requestFrom('203.0.113.9'), 'ask')

  assertEquals(calls.length, 2)
  assertEquals(calls[1].ipHash, GLOBAL_KEY)
  assertEquals(calls[0].endpoint, 'ask')
})

Deno.test('refuses once the caller passes the ask allowance', async () => {
  const hash = await hashIp('203.0.113.9', 'salt')
  const { store } = countingStore({ [`${hash}:ask`]: ASK_DAILY_LIMIT })
  const quota = createQuota(store, 'salt')

  await assertRejects(
    () => quota.check(requestFrom('203.0.113.9'), 'ask'),
    RateLimitError,
  )
})

Deno.test('the dossier allowance is separate and smaller', async () => {
  const hash = await hashIp('203.0.113.9', 'salt')
  const { store } = countingStore({ [`${hash}:dossier`]: DOSSIER_DAILY_LIMIT })
  const quota = createQuota(store, 'salt')

  await assertRejects(
    () => quota.check(requestFrom('203.0.113.9'), 'dossier'),
    RateLimitError,
  )

  // The ask allowance is untouched by the dossier one.
  await quota.check(requestFrom('203.0.113.9'), 'ask')
})

Deno.test('refuses once the application passes its own daily ceiling', async () => {
  const { store } = countingStore({ [`${GLOBAL_KEY}:all`]: GLOBAL_DAILY_LIMIT })
  const quota = createQuota(store, 'salt')

  await assertRejects(
    () => quota.check(requestFrom('198.51.100.4'), 'ask'),
    RateLimitError,
    'demand',
  )
})
