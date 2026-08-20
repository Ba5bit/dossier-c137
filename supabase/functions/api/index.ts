import { createRouter } from './router.ts'
import { createRmClient } from './clients/rmClient.ts'
import { createCache, createPostgresStore } from './lib/cache.ts'
import { createCharacterService } from './services/characters.ts'

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

const store = createPostgresStore(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)
const service = createCharacterService(createRmClient(), createCache(store))
const route = createRouter(service)

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
