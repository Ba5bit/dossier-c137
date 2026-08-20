import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChatPanel } from '../features/ai/ChatPanel'
import { COPY } from '../shared/lore/copy'
import type { AskFocus } from '../shared/api/types'

const SECTIONS: Record<string, AskFocus['type']> = {
  characters: 'character',
  locations: 'location',
  episodes: 'episode',
}

/**
 * "characters/35" — the dossier the visitor left to come here, in the same
 * shape as the route they left. Anything else is dropped: the parameter is
 * an enrichment, and a malformed one must not cost them their question.
 */
export function parseFocus(raw: string | null): AskFocus | undefined {
  if (!raw) return undefined

  const [section, rest] = raw.split('/')
  const type = SECTIONS[section]
  const id = Number(rest)

  if (!type || !Number.isInteger(id) || id < 1) return undefined
  return { type, id }
}

export function AskPage() {
  const [params] = useSearchParams()
  const question = params.get('q') ?? undefined
  const raw = params.get('focus')

  // A fresh object every render would restart the stream callback each time.
  const focus = useMemo(() => parseFocus(raw), [raw])

  return (
    <main className="mx-auto max-w-[840px] space-y-8 px-4 py-10 sm:px-6">
      <header className="space-y-3">
        <p className="font-mono text-xs tracking-widest text-muted">
          {COPY.ask.stamp}
        </p>
        <h1 className="text-fg text-3xl font-bold tracking-tight">{COPY.ask.heading}</h1>
        <p className="text-muted text-sm">
          {COPY.ask.tagline}
        </p>
      </header>

      <ChatPanel initialQuestion={question} focus={focus} />
    </main>
  )
}
