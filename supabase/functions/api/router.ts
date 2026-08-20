import {
  handleGetCharacter,
  handleListCharacters,
  type CharacterService,
} from './handlers/characters.ts'
import {
  handleGetLocation,
  handleListLocations,
  type LocationService,
} from './handlers/locations.ts'
import {
  handleGetEpisode,
  handleListEpisodes,
  type EpisodeService,
} from './handlers/episodes.ts'
import { handleGetStats, type StatsService } from './handlers/stats.ts'
import { handleSearch, type SearchService } from './handlers/search.ts'
import { handleDossier, type DossierService, type QuotaLike } from './handlers/dossier.ts'
import { prepareAsk, type AskService } from './handlers/ask.ts'
import type { AskEvent } from './types.ts'
import { AppError } from './lib/errors.ts'

const JSON_HEADERS = { 'content-type': 'application/json' }

export type Services = {
  characters: CharacterService
  locations: LocationService
  episodes: EpisodeService
  stats: StatsService
  search: SearchService
  dossier: DossierService
  ask: AskService
  quota: QuotaLike
}

/**
 * Supabase routes requests to `/functions/v1/<name>/...`, so the function
 * name arrives as the first path segment. Strip it so handlers see clean paths.
 */
export function normalizePath(pathname: string): string {
  const stripped = pathname.replace(/^\/+api/, '')
  return stripped === '' || stripped === '/' ? '/' : stripped.replace(/\/+$/, '')
}

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...extra },
  })
}

function staleHeaders(stale: boolean): Record<string, string> {
  return stale ? { 'X-Cache': 'stale' } : {}
}

function errorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return json(
      { error: { code: error.code, message: error.message } },
      error.status,
    )
  }
  return json(
    { error: { code: 'INTERNAL', message: 'Unexpected failure' } },
    500,
  )
}

const SSE_HEADERS = {
  'content-type': 'text/event-stream',
  'cache-control': 'no-cache',
  connection: 'keep-alive',
}

function frame(event: AskEvent): string {
  return `event: ${event.type}
data: ${JSON.stringify(event)}

`
}

/**
 * A failure after the first byte cannot change the status code, so it is
 * emitted in-band as an error event. The frontend renders it inside the
 * conversation; the rest of the page is untouched.
 */
function sse(events: AsyncGenerator<AskEvent>): Response {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of events) {
          controller.enqueue(encoder.encode(frame(event)))
        }
      } catch (error) {
        const failure: AskEvent = error instanceof AppError
          ? { type: 'error', code: error.code, message: error.message }
          : { type: 'error', code: 'INTERNAL', message: 'Unexpected failure' }
        controller.enqueue(encoder.encode(frame(failure)))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, { status: 200, headers: SSE_HEADERS })
}

export function createRouter(services: Services) {
  return async function route(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = normalizePath(url.pathname)

    try {
      if (path === '/health') {
        return json({ status: 'ok' })
      }

      if (request.method === 'POST') {
        if (path === '/dossier') {
          const { body } = await handleDossier(request, services.dossier, services.quota)
          return json(body)
        }

        if (path === '/ask') {
          const input = await prepareAsk(request, services.quota)
          return sse(services.ask.ask(input))
        }

        return json(
          { error: { code: 'NOT_FOUND', message: `No route for ${path}` } },
          404,
        )
      }

      if (request.method !== 'GET') {
        return json(
          { error: { code: 'NOT_FOUND', message: `No route for ${path}` } },
          404,
        )
      }

      if (path === '/characters') {
        const { body, stale } = await handleListCharacters(url, services.characters)
        return json(body, 200, staleHeaders(stale))
      }

      if (path === '/locations') {
        const { body, stale } = await handleListLocations(url, services.locations)
        return json(body, 200, staleHeaders(stale))
      }

      if (path === '/episodes') {
        const { body, stale } = await handleListEpisodes(url, services.episodes)
        return json(body, 200, staleHeaders(stale))
      }

      if (path === '/stats') {
        const { body, stale } = await handleGetStats(services.stats)
        return json(body, 200, staleHeaders(stale))
      }

      if (path === '/search') {
        const { body, stale } = await handleSearch(url, services.search)
        return json(body, 200, staleHeaders(stale))
      }

      // The id segment is matched loosely so that a malformed id reaches the
      // validator and answers 400, rather than falling through to a 404.
      const detail = path.match(/^\/(characters|locations|episodes)\/([^/]+)$/)
      if (detail) {
        const [, section, rawId] = detail

        if (section === 'characters') {
          const { body, stale } = await handleGetCharacter(rawId, services.characters)
          return json(body, 200, staleHeaders(stale))
        }

        if (section === 'locations') {
          const { body, stale } = await handleGetLocation(rawId, services.locations)
          return json(body, 200, staleHeaders(stale))
        }

        const { body, stale } = await handleGetEpisode(rawId, services.episodes)
        return json(body, 200, staleHeaders(stale))
      }

      return json(
        { error: { code: 'NOT_FOUND', message: `No route for ${path}` } },
        404,
      )
    } catch (error) {
      return errorResponse(error)
    }
  }
}
