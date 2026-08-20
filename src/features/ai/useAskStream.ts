import { useCallback, useRef, useState } from 'react'
import { ApiError, streamAsk } from '../../shared/api/client'
import type { AskSource, Persona } from '../../shared/api/types'

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  sources?: AskSource[]
  error?: string
}

export function useAskStream(persona: Persona) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)

  // The history sent with the next question has to be read synchronously,
  // before the state update for this one has been applied.
  const historyRef = useRef<ChatMessage[]>([])

  const write = useCallback((next: (current: ChatMessage[]) => ChatMessage[]) => {
    setMessages((current) => {
      const updated = next(current)
      historyRef.current = updated
      return updated
    })
  }, [])

  const patchAnswer = useCallback(
    (patch: (message: ChatMessage) => ChatMessage) => {
      write((current) =>
        current.map((message, index) =>
          index === current.length - 1 ? patch(message) : message,
        ),
      )
    },
    [write],
  )

  const ask = useCallback(
    async (question: string) => {
      const trimmed = question.trim()
      if (trimmed === '') return

      const history = historyRef.current
        .filter((message) => message.error === undefined && message.content !== '')
        .map((message) => ({ role: message.role, content: message.content }))

      write((current) => [
        ...current,
        { role: 'user', content: trimmed },
        { role: 'assistant', content: '', sources: [] },
      ])
      setStreaming(true)

      try {
        for await (const event of streamAsk({ q: trimmed, persona, history })) {
          if (event.type === 'sources') {
            patchAnswer((message) => ({ ...message, sources: event.sources }))
          }
          if (event.type === 'token') {
            patchAnswer((message) => ({ ...message, content: message.content + event.text }))
          }
          if (event.type === 'error') {
            patchAnswer((message) => ({ ...message, error: event.message }))
          }
        }
      } catch (failure) {
        const text = failure instanceof ApiError
          ? failure.message
          : 'The connection collapsed somewhere between dimensions.'
        patchAnswer((message) => ({ ...message, error: text }))
      } finally {
        setStreaming(false)
      }
    },
    [persona, patchAnswer, write],
  )

  const reset = useCallback(() => {
    write(() => [])
  }, [write])

  return { messages, streaming, ask, reset }
}
