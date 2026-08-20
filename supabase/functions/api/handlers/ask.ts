import { parseAskBody, readJsonBody } from '../lib/validate.ts'
import type { QuotaLike } from './dossier.ts'
import type { AskEvent, ChatTurn, Persona } from '../types.ts'

export type AskService = {
  ask(input: { q: string; persona: Persona; history: ChatTurn[] }): AsyncGenerator<AskEvent>
}

/**
 * Everything that can produce an HTTP status happens here, before the router
 * constructs the stream. Once the first byte is out, a 429 is no longer
 * expressible.
 */
export async function prepareAsk(
  request: Request,
  quota: QuotaLike,
): Promise<{ q: string; persona: Persona; history: ChatTurn[] }> {
  const body = parseAskBody(await readJsonBody(request))
  await quota.check(request, 'ask')
  return body
}
