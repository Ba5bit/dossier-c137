import type { AskFocus, AskSource, Persona } from '../../shared/api/types'

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  /** Who answered. Fixed at the time of the answer, not read from settings. */
  persona?: Persona
  sources?: AskSource[]
  /** Records the answer may link to without being grounded in them. */
  citable?: AskSource[]
  suggestions?: string[]
  error?: string
}

/**
 * One tab, one transcript per subject. It is sessionStorage rather than
 * localStorage because a conversation is not a preference: a new tab starts a
 * new one, and closing the tab is how a visitor throws it away without being
 * asked.
 */
const TRANSCRIPT_ROOT = 'dossier.ask.transcript'

/**
 * A log per record, rather than one log everything lands in. Asking about the
 * Citadel and then about an episode are two conversations, and threading them
 * together buries both — without any of the sidebar a chat app needs, because
 * the subject is already in the route.
 */
export function transcriptKey(focus?: AskFocus): string {
  if (!focus) return `${TRANSCRIPT_ROOT}.archive`
  return `${TRANSCRIPT_ROOT}.${focus.type}-${focus.id}`
}

const PERSONAS = ['rick', 'morty']

function parseMessage(raw: unknown): ChatMessage | null {
  if (typeof raw !== 'object' || raw === null) return null
  const candidate = raw as Record<string, unknown>

  if (candidate.role !== 'user' && candidate.role !== 'assistant') return null
  if (typeof candidate.content !== 'string' || candidate.content === '') return null

  const persona = typeof candidate.persona === 'string' && PERSONAS.includes(candidate.persona)
    ? (candidate.persona as Persona)
    : undefined

  return {
    role: candidate.role,
    content: candidate.content,
    persona,
    sources: Array.isArray(candidate.sources) ? (candidate.sources as AskSource[]) : [],
    citable: Array.isArray(candidate.citable) ? (candidate.citable as AskSource[]) : [],
    suggestions: Array.isArray(candidate.suggestions)
      ? (candidate.suggestions as string[])
      : [],
  }
}

export function parseTranscript(raw: string | null): ChatMessage[] {
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(parseMessage).filter((message): message is ChatMessage => message !== null)
  } catch {
    return []
  }
}

/**
 * A half-streamed answer and a failed one are both dropped: what comes back
 * has to be a transcript the visitor could have read, and an empty bubble
 * under their question reads as the archive losing it.
 */
export function serializeTranscript(messages: ChatMessage[]): string {
  const settled: ChatMessage[] = []

  for (const message of messages) {
    if (message.content === '' || message.error !== undefined) {
      // Drop the question that goes with a lost answer, too.
      if (message.role === 'assistant') settled.pop()
      continue
    }
    settled.push({ ...message, error: undefined })
  }

  return JSON.stringify(settled)
}
