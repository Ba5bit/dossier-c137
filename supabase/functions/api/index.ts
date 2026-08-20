import { createRouter } from './router.ts'
import { createRmClient } from './clients/rmClient.ts'
import { createCache, createPostgresStore } from './lib/cache.ts'
import { createCharacterService } from './services/characters.ts'
import { createEpisodeService } from './services/episodes.ts'
import { createLocationService } from './services/locations.ts'
import { createStatsService } from './services/stats.ts'
import { createSearchService } from './services/search.ts'
import { createGrokClient } from './clients/grokClient.ts'
import { createPostgresUsageStore, createQuota } from './lib/quota.ts'
import { createPostgresDossierStore } from './lib/dossierStore.ts'
import { createDossierService } from './services/dossier.ts'
import { createAskService } from './services/ask.ts'
import { AiError } from './lib/errors.ts'

const ALLOWED_ORIGIN_PATTERNS = [
  /^http:\/\/localhost:\d+$/,
  /^https:\/\/.*\.vercel\.app$/,
]

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGIN_PATTERNS.some((p) => p.test(origin))
  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'null',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
    'Access-Control-Max-Age': '86400',
  }
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const grokKey = Deno.env.get('XAI_API_KEY')
const hashSalt = Deno.env.get('IP_HASH_SALT') ?? 'unsalted-development'

const store = createPostgresStore(supabaseUrl, serviceKey)
const client = createRmClient()
const cache = createCache(store)
const characters = createCharacterService(client, cache)
const search = createSearchService(client, cache)

/**
 * A missing key must not take the archive down with it: the three read
 * sections keep working and only the AI endpoints report themselves
 * unavailable. The stand-in satisfies the same contract as the real client.
 */
const grok = grokKey
  ? createGrokClient({ apiKey: grokKey, model: Deno.env.get('GROK_MODEL') })
  : {
    model: 'unconfigured',
    complete: (): Promise<string> => {
      throw new AiError('The AI provider is not configured')
    },
    stream: async function* (): AsyncGenerator<string> {
      throw new AiError('The AI provider is not configured')
    },
  }

const route = createRouter({
  characters,
  locations: createLocationService(client, cache),
  episodes: createEpisodeService(client, cache),
  stats: createStatsService(client, cache),
  search,
  dossier: createDossierService(
    characters,
    grok,
    createPostgresDossierStore(supabaseUrl, serviceKey),
  ),
  ask: createAskService(search, grok),
  quota: createQuota(createPostgresUsageStore(supabaseUrl, serviceKey), hashSalt),
})

Deno.serve(async (request) => {
  const cors = corsHeaders(request.headers.get('origin'))

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }

  const response = await route(request)
  for (const [key, value] of Object.entries(cors)) {
    response.headers.set(key, value)
  }
  return response
})
