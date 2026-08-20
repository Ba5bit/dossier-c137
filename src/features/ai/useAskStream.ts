import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, streamAsk } from '../../shared/api/client'
import { parseTranscript, serializeTranscript, transcriptKey } from './transcript'
import type { ChatMessage } from './transcript'
import type { AskFocus, Persona } from '../../shared/api/types'

export type { ChatMessage } from './transcript'

function readStoredTranscript(key: string): ChatMessage[] {
  try {
    return parseTranscript(sessionStorage.getItem(key))
  } catch {
    // Private-mode browsers throw on access rather than returning null.
    return []
  }
}

export function useAskStream(persona: Persona, focus?: AskFocus) {
  const key = transcriptKey(focus)

  // Restored rather than empty: following a source card out of the chat and
  // coming back used to lose the conversation, and the question the page
  // arrived with was then paid for a second time.
  const [messages, setMessages] = useState<ChatMessage[]>(() => readStoredTranscript(key))
  const [streaming, setStreaming] = useState(false)

  // The history sent with the next question has to be read synchronously,
  // before the state update for this one has been applied.
  const historyRef = useRef<ChatMessage[]>(messages)
  const keyRef = useRef(key)

  useEffect(() => {
    if (keyRef.current === key) return
    // A different record is a different conversation. Swapping the log has to
    // happen before anything is written back, or the outgoing subject's
    // transcript lands under the incoming subject's key.
    keyRef.current = key
    const restored = readStoredTranscript(key)
    historyRef.current = restored
    setMessages(restored)
  }, [key])

  useEffect(() => {
    if (streaming || keyRef.current !== key) return
    try {
      sessionStorage.setItem(key, serializeTranscript(messages))
    } catch {
      // A blocked or full store costs persistence, not the session.
    }
  }, [key, messages, streaming])

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
        { role: 'assistant', content: '', persona, sources: [] },
      ])
      setStreaming(true)

      try {
        for await (const event of streamAsk({ q: trimmed, persona, history, focus })) {
          if (event.type === 'sources') {
            patchAnswer((message) => ({
              ...message,
              sources: event.sources,
              citable: event.citable,
            }))
          }
          if (event.type === 'token') {
            patchAnswer((message) => ({ ...message, content: message.content + event.text }))
          }
          if (event.type === 'suggestions') {
            patchAnswer((message) => ({ ...message, suggestions: event.suggestions }))
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
    [focus, persona, patchAnswer, write],
  )

  const reset = useCallback(() => {
    write(() => [])
  }, [write])

  return { messages, streaming, ask, reset }
}
