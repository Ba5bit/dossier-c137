import { useEffect, useRef, useState } from 'react'

// Long enough that a burst of typing produces one navigation, short enough
// that the grid still feels like it reacts to the keyboard.
export const FILTER_DEBOUNCE_MS = 300

const FIELD =
  'border border-line bg-surface px-3 py-2 font-mono text-xs text-fg ' +
  'outline-none focus:border-accent'

const LABEL = 'font-mono text-xs tracking-widest text-muted'

type TextFilterProps = {
  id: string
  label: string
  placeholder: string
  value: string | undefined
  width: string
  onCommit: (value: string | undefined) => void
}

/**
 * A text filter keeps its own draft and pushes it upward on a debounce.
 *
 * Binding the input straight to the URL loses keystrokes: the round trip
 * through the router is asynchronous, so React restores the stale value into
 * the DOM while the next character is already being typed.
 */
export function TextFilter({
  id,
  label,
  placeholder,
  value,
  width,
  onCommit,
}: TextFilterProps) {
  const external = value ?? ''
  const [draft, setDraft] = useState(external)
  const committed = useRef(external)

  useEffect(() => {
    // Ignore the echo of our own commit; adopt anything else — the clear
    // button, the back button, a pasted URL.
    if (external === committed.current) return
    committed.current = external
    setDraft(external)
  }, [external])

  useEffect(() => {
    if (draft === committed.current) return

    const timer = setTimeout(() => {
      committed.current = draft
      onCommit(draft || undefined)
    }, FILTER_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [draft, onCommit])

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={draft}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        className={`${FIELD} ${width}`}
      />
    </div>
  )
}
