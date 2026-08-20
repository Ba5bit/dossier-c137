import { describe, expect, it } from 'vitest'
import { parseTranscript, serializeTranscript, transcriptKey } from './transcript'
import type { ChatMessage } from './transcript'

describe('transcriptKey', () => {
  it('gives every record its own log, and the archive its own', () => {
    expect(transcriptKey({ type: 'location', id: 3 })).not.toBe(transcriptKey())
    expect(transcriptKey({ type: 'location', id: 3 })).not.toBe(
      transcriptKey({ type: 'character', id: 3 }),
    )
    expect(transcriptKey({ type: 'location', id: 3 })).toBe(
      transcriptKey({ type: 'location', id: 3 }),
    )
  })
})

describe('serializeTranscript', () => {
  it('keeps a settled exchange, persona and all', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'who is Rick?' },
      { role: 'assistant', content: 'Me.', persona: 'rick', sources: [], suggestions: [] },
    ]

    expect(parseTranscript(serializeTranscript(messages))).toEqual([
      { role: 'user', content: 'who is Rick?', persona: undefined, sources: [], citable: [], suggestions: [] },
      { role: 'assistant', content: 'Me.', persona: 'rick', sources: [], citable: [], suggestions: [] },
    ])
  })

  it('drops a failed exchange along with the question that caused it', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'who is Rick?' },
      { role: 'assistant', content: 'Me.', persona: 'rick' },
      { role: 'user', content: 'and then?' },
      { role: 'assistant', content: '', persona: 'rick', error: 'Out of portal fluid.' },
    ]

    const kept = parseTranscript(serializeTranscript(messages))
    expect(kept.map((message) => message.content)).toEqual(['who is Rick?', 'Me.'])
  })
})

describe('parseTranscript', () => {
  it('returns nothing rather than throwing on junk', () => {
    expect(parseTranscript(null)).toEqual([])
    expect(parseTranscript('not json')).toEqual([])
    expect(parseTranscript('{"role":"user"}')).toEqual([])
    expect(parseTranscript('[{"role":"nobody","content":"hi"}]')).toEqual([])
    expect(parseTranscript('[{"role":"user","content":""}]')).toEqual([])
  })
})
