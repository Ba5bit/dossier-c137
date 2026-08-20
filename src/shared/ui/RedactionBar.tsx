import { COPY } from '../lore/copy'

type RedactionBarProps = {
  label: string
  testId?: string
  className?: string
}

const CHIP =
  'inline-block border border-dashed border-line px-2 py-[1px] align-middle ' +
  'font-mono text-[10px] tracking-widest text-muted'

/**
 * Half of all origins in the archive are unknown, so this is a routine field
 * state rather than a flourish.
 *
 * It used to be a solid bar of the foreground colour, which in a light
 * dimension is a black rectangle and in a dark one a white rectangle — read
 * on sight as a broken image rather than as a censored field. A word inside a
 * dashed outline says the same thing and says it in the archive's own voice.
 */
export function RedactionBar({ label, testId, className = '' }: RedactionBarProps) {
  return (
    <span data-testid={testId} aria-label={label} className={`${CHIP} ${className}`}>
      {COPY.redaction.redacted}
    </span>
  )
}

/**
 * FINDING-011: an empty field used to print an em dash on the detail pages
 * and a redaction bar on the cards. Two treatments for one idea. Redacted is
 * a value the archive is withholding; this is one it never had.
 */
export function NotOnFile({ label }: { label: string }) {
  return (
    <span aria-label={label} className={CHIP}>
      {COPY.redaction.notOnFile}
    </span>
  )
}
