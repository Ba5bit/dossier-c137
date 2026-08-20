import { AiError } from '../lib/errors.ts'

const BASE_URL = 'https://api.x.ai/v1'

/**
 * xAI's fast tier. It is a constant rather than a hardcoded literal so that
 * index.ts can override it from GROK_MODEL without touching this file.
 */
export const DEFAULT_MODEL = 'grok-4-fast-non-reasoning'

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type GrokFetchFn = (url: string, init: RequestInit) => Promise<Response>

export type GrokOptions = {
  apiKey: string
  model?: string
  fetchFn?: GrokFetchFn
}

export function createGrokClient(options: GrokOptions) {
  const { apiKey, model = DEFAULT_MODEL, fetchFn = fetch } = options

  async function post(messages: ChatMessage[], stream: boolean): Promise<Response> {
    let response: Response
    try {
      response = await fetchFn(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          stream,
          // Enough freedom for a voice, not enough for a new universe.
          temperature: 0.7,
          max_tokens: 400,
        }),
      })
    } catch (cause) {
      throw new AiError(`Grok unreachable: ${(cause as Error).message}`)
    }

    if (!response.ok) {
      // The body may carry a useful reason, but it must never reach the
      // browser: it can echo the prompt back.
      await response.body?.cancel()
      throw new AiError(`Grok returned ${response.status}`)
    }

    return response
  }

  async function complete(messages: ChatMessage[]): Promise<string> {
    const response = await post(messages, false)
    const body = await response.json() as {
      choices?: { message?: { content?: string } }[]
    }
    const text = body.choices?.[0]?.message?.content?.trim()

    if (!text) {
      throw new AiError('Grok returned an empty completion')
    }

    return text
  }

  async function* stream(messages: ChatMessage[]): AsyncGenerator<string> {
    const response = await post(messages, true)

    if (!response.body) {
      throw new AiError('Grok returned no stream body')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // A network read is not a frame boundary. Keep whatever follows the
      // last blank line for the next iteration.
      const frames = buffer.split('\n\n')
      buffer = frames.pop() ?? ''

      for (const frame of frames) {
        const line = frame.trim()
        if (!line.startsWith('data:')) continue

        const payload = line.slice('data:'.length).trim()
        if (payload === '[DONE]') return

        try {
          const parsed = JSON.parse(payload) as {
            choices?: { delta?: { content?: string } }[]
          }
          const text = parsed.choices?.[0]?.delta?.content
          if (text) yield text
        } catch {
          // A malformed frame is the provider's problem, not a reason to
          // abandon an answer that is already half delivered.
          continue
        }
      }
    }
  }

  return { complete, stream, model }
}

export type GrokClient = ReturnType<typeof createGrokClient>
