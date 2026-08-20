import {
  handleGetCharacter,
  handleListCharacters,
  type CharacterService,
} from './handlers/characters.ts'
import { AppError } from './lib/errors.ts'

const JSON_HEADERS = { 'content-type': 'application/json' }

export type Services = {
  characters: CharacterService
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

export function createRouter(services: Services) {
  return async function route(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = normalizePath(url.pathname)

    try {
      if (path === '/health') {
        return json({ status: 'ok' })
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

      // The id segment is matched loosely so that a malformed id reaches the
      // validator and answers 400, rather than falling through to a 404.
      const detail = path.match(/^\/(characters)\/([^/]+)$/)
      if (detail) {
        const { body, stale } = await handleGetCharacter(detail[2], services.characters)
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
