type RedactionBarProps = {
  label: string
  testId?: string
  className?: string
}

/**
 * Half of all origins in the archive are unknown, so this is a routine field
 * state rather than a flourish. It carries a label because a bare bar tells a
 * screen reader nothing.
 */
export function RedactionBar({ label, testId, className = 'w-20' }: RedactionBarProps) {
  return (
    <span
      data-testid={testId}
      aria-label={label}
      className={`inline-block h-3 bg-fg align-middle ${className}`}
    />
  )
}
