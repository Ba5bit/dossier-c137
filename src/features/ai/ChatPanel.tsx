import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useAskStream } from './useAskStream'
import { SourceCards } from './SourceCards'
import { PersonaChoice } from './PersonaChoice'
import { AnswerText } from './AnswerText'
import { useFocusRecord } from './useFocusRecord'
import { PortalLink } from '../../shared/portal/PortalLink'
import { COPY } from '../../shared/lore/copy'
import { useSettings } from '../../shared/settings/useSettings'
import type { AskFocus } from '../../shared/api/types'

const SECTIONS: Record<AskFocus['type'], string> = {
  character: 'characters',
  location: 'locations',
  episode: 'episodes',
}

type ChatPanelProps = {
  /** A question carried in from the search box, asked once on arrival. */
  initialQuestion?: string
  /** The record the visitor was reading when they came here to ask. */
  focus?: AskFocus
}

export function ChatPanel({ initialQuestion, focus }: ChatPanelProps) {
  const { settings } = useSettings()
  const { messages, streaming, ask, reset } = useAskStream(settings.persona, focus)
  const [draft, setDraft] = useState('')
  const { data: focusName } = useFocusRecord(focus)

  const asked = useRef<string | null>(null)

  useEffect(() => {
    const question = initialQuestion?.trim()
    if (!question || asked.current === question) return

    // A ref rather than a mount-only effect: the route can change the query
    // without unmounting the page, and the same question must not be paid
    // for twice.
    asked.current = question

    // Nor a second time after a round trip. Following a source card out and
    // coming back remounts this panel with the same ?q= still in the URL,
    // and re-running it spent a call on an answer already on the page.
    const alreadyAnswered = messages.some(
      (message) => message.role === 'user' && message.content === question,
    )
    if (alreadyAnswered) return

    void ask(question)
    // messages is read for the guard above, deliberately not tracked: a new
    // answer landing must not re-run the question that produced it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion, ask])

  const focusHref = focus ? `/${SECTIONS[focus.type]}/${focus.id}` : '/'

  function handleClear() {
    // The question in the URL outlives the transcript, so it is disarmed
    // here as well: clearing and being asked it again is not clearing.
    asked.current = initialQuestion?.trim() ?? null
    reset()
  }

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
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <p className="font-mono text-xs tracking-widest text-accent">
          {COPY.ai.personaNames[settings.persona]}
        </p>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              disabled={streaming}
              className="tap-target border border-line px-3 py-2 font-mono text-xs tracking-widest text-muted transition-colors hover:border-dead hover:text-dead disabled:opacity-50"
            >
              {COPY.ai.clear}
            </button>
          )}
          <PersonaChoice />
        </div>
      </header>

      {/* The record the questions are about, and a way back to it. The
          header's ASK AI carries it here silently; unsaid, it reads as the
          answers being oddly narrow. */}
      {focus && (
        <div className="space-y-2 border border-line bg-surface px-4 py-3">
          <p className="font-mono text-xs tracking-widest text-muted">
            {COPY.ai.focusLabel}{' '}
            <PortalLink to={focusHref} className="text-accent hover:underline">
              {/* The number until the record answers for itself: the name is
                  usually already cached from the page they came from. */}
              {focusName ?? `${SECTIONS[focus.type].toUpperCase()} #${focus.id}`}
            </PortalLink>
          </p>
          <p className="text-muted text-xs">{COPY.ai.focusHint}</p>
        </div>
      )}

      {messages.length === 0 && (
        <div className="space-y-4">
          <p className="text-muted text-sm">{COPY.ai.greetings[settings.persona]}</p>

          {/* An empty chat teaches nothing. These are real archive names, so
              the first answer a visitor sees is a grounded one. */}
          <div className="space-y-2">
            <p className="font-mono text-xs tracking-widest text-muted">
              {COPY.ai.openersLabel}
            </p>
            <ul className="flex flex-wrap gap-2">
              {COPY.ai.openers.map((opener) => (
                <li key={opener}>
                  <button
                    type="button"
                    disabled={streaming}
                    onClick={() => void ask(opener)}
                    className="tap-target border border-line px-3 py-2 text-left text-sm text-link transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
                  >
                    {opener}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <ol className="space-y-6">
        {messages.map((message, index) => (
          <li key={index} className="space-y-1">
            <p className="font-mono text-xs tracking-widest text-muted">
              {message.role === 'user'
                ? COPY.ai.you
                : COPY.ai.personaNames[message.persona ?? settings.persona]}
            </p>

            {message.role === 'user' ? (
              <p className="text-fg text-sm">{message.content}</p>
            ) : (
              <>
                <p className="text-fg text-sm leading-relaxed">
                  <AnswerText
                    text={message.content}
                    sources={message.sources ?? []}
                    citable={message.citable ?? []}
                  />
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

                {/* Only under the newest answer: older chips would compete
                    with the input for the same click. */}
                {index === messages.length - 1 &&
                  !streaming &&
                  (message.suggestions?.length ?? 0) > 0 && (
                    <div className="space-y-2 pt-2">
                      <p className="font-mono text-xs tracking-widest text-muted">
                        {COPY.ai.nextLabel}
                      </p>
                      <ul className="flex flex-wrap gap-2">
                        {message.suggestions?.map((suggestion) => (
                          <li key={suggestion}>
                            <button
                              type="button"
                              onClick={() => void ask(suggestion)}
                              className="tap-target border border-line px-3 py-2 text-left text-sm text-link transition-colors hover:border-accent hover:text-accent"
                            >
                              {suggestion}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </>
            )}
          </li>
        ))}
      </ol>

      <form onSubmit={onSubmit} className="space-y-2">
        {/* FINDING-009: the placeholder was the only prompt this field had. */}
        <label
          htmlFor="ask-input"
          className="block font-mono text-xs tracking-widest text-muted"
        >
          {COPY.ai.visibleInputLabel}
        </label>

        <div className="flex gap-2">
        <input
          id="ask-input"
          type="text"
          value={draft}
          aria-label={COPY.ai.inputLabel}
          placeholder={COPY.ai.inputPlaceholder}
          onChange={(event) => setDraft(event.target.value)}
          className="text-fg placeholder:text-muted w-full min-w-0 border border-line bg-surface px-4 py-3 font-mono text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={streaming}
          className="shrink-0 border border-accent bg-accent/10 px-4 font-mono text-xs tracking-widest text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
        >
          {COPY.ai.send}
        </button>
        </div>
      </form>
    </section>
  )
}
