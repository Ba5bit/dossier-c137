import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useAskStream } from './useAskStream'
import { SourceCards } from './SourceCards'
import { PersonaChoice } from './PersonaChoice'
import { BurpText } from './BurpText'
import { PERSONA_GREETINGS, PERSONA_NAMES } from './persona'
import { useSettings } from '../../shared/settings/useSettings'

type ChatPanelProps = {
  /** A question carried in from the search box, asked once on arrival. */
  initialQuestion?: string
}

export function ChatPanel({ initialQuestion }: ChatPanelProps) {
  const { settings } = useSettings()
  const { messages, streaming, ask } = useAskStream(settings.persona)
  const [draft, setDraft] = useState('')
  const asked = useRef<string | null>(null)

  useEffect(() => {
    const question = initialQuestion?.trim()
    if (!question || asked.current === question) return

    // A ref rather than a mount-only effect: the route can change the query
    // without unmounting the page, and the same question must not be paid
    // for twice.
    asked.current = question
    void ask(question)
  }, [initialQuestion, ask])

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (streaming) return
    const question = draft.trim()
    if (question === '') return
    setDraft('')
    void ask(question)
  }

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between gap-4 border-b border-line pb-3">
        <p className="font-mono text-xs tracking-widest text-accent">
          {PERSONA_NAMES[settings.persona]}
        </p>
        <PersonaChoice />
      </header>

      {messages.length === 0 && (
        <p className="text-muted text-sm">{PERSONA_GREETINGS[settings.persona]}</p>
      )}

      <ol className="space-y-6">
        {messages.map((message, index) => (
          <li key={index} className="space-y-1">
            <p className="font-mono text-xs tracking-widest text-muted">
              {message.role === 'user' ? 'YOU' : PERSONA_NAMES[settings.persona]}
            </p>

            {message.role === 'user' ? (
              <p className="text-fg text-sm">{message.content}</p>
            ) : (
              <>
                <p className="text-fg text-sm leading-relaxed">
                  <BurpText text={message.content} />
                  {streaming && index === messages.length - 1 && (
                    <span aria-hidden="true" className="ml-1 animate-pulse text-accent">
                      ▍
                    </span>
                  )}
                </p>
                {message.error && (
                  <p className="text-sm text-dead">{message.error}</p>
                )}
                <SourceCards sources={message.sources ?? []} />
              </>
            )}
          </li>
        ))}
      </ol>

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          type="text"
          value={draft}
          aria-label="Ask a question"
          placeholder="ASK ABOUT ANYTHING ON FILE"
          onChange={(event) => setDraft(event.target.value)}
          className="text-fg placeholder:text-muted w-full border border-line bg-surface px-4 py-3 font-mono text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={streaming}
          className="shrink-0 border border-line px-4 font-mono text-xs text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
        >
          SEND ▸
        </button>
      </form>
    </section>
  )
}
