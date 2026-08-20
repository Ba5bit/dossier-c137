import { createClient } from 'jsr:@supabase/supabase-js@2'
import { RateLimitError } from './errors.ts'

export type QuotaEndpoint = 'ask' | 'dossier'

export const ASK_DAILY_LIMIT = 30
export const DOSSIER_DAILY_LIMIT = 10

/** Backstop against distributed traffic: no single day costs more than this. */
export const GLOBAL_DAILY_LIMIT = 500

/** A digest is 64 hex characters, so this key cannot collide with one. */
export const GLOBAL_KEY = '__global__'

const LIMITS: Record<QuotaEndpoint, number> = {
  ask: ASK_DAILY_LIMIT,
  dossier: DOSSIER_DAILY_LIMIT,
}

export type UsageStore = {
  /** Increments today's counter and returns its new value. */
  bump(ipHash: string, endpoint: string): Promise<number>
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (!forwarded) return 'unknown'
  return forwarded.split(',')[0].trim() || 'unknown'
}

export async function hashIp(ip: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${ip}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export function createQuota(store: UsageStore, salt: string) {
  async function check(request: Request, endpoint: QuotaEndpoint): Promise<void> {
    const ipHash = await hashIp(clientIp(request), salt)

    const mine = await store.bump(ipHash, endpoint)
    if (mine > LIMITS[endpoint]) {
      throw new RateLimitError(
        `The portal gun is out of fluid for today: ${LIMITS[endpoint]} ${endpoint} calls per day.`,
      )
    }

    const everyone = await store.bump(GLOBAL_KEY, 'all')
    if (everyone > GLOBAL_DAILY_LIMIT) {
      throw new RateLimitError(
        'The archive has burned through today\'s AI budget. Unprecedented demand. Try tomorrow.',
      )
    }
  }

  return { check }
}

export function createPostgresUsageStore(url: string, serviceKey: string): UsageStore {
  const db = createClient(url, serviceKey)

  return {
    async bump(ipHash, endpoint) {
      const { data, error } = await db.rpc('ai_usage_bump', {
        p_ip_hash: ipHash,
        p_endpoint: endpoint,
      })

      // A counter that cannot be written must not become an open door, and
      // must not become an outage either: report the call as the first of
      // the day and let the request through. The global ceiling and the
      // provider's own limits remain behind it.
      if (error || typeof data !== 'number') return 1

      return data
    },
  }
}
