type StatusIndicatorProps = {
  status: string
}

type Kind = 'alive' | 'dead' | 'unknown'

const DOT_CLASS: Record<Kind, string> = {
  alive: 'bg-alive animate-pulse',
  dead: 'bg-dead',
  unknown: 'bg-unknown',
}

function toKind(status: string): Kind {
  const normalized = status.toLowerCase()
  if (normalized === 'alive') return 'alive'
  if (normalized === 'dead') return 'dead'
  return 'unknown'
}

export function StatusIndicator({ status }: StatusIndicatorProps) {
  const kind = toKind(status)

  return (
    <span className="flex items-center gap-2 font-mono text-xs">
      <span
        data-status={kind}
        aria-hidden="true"
        className={`inline-block h-2 w-2 rounded-full ${DOT_CLASS[kind]}`}
      />
      <span className="text-muted">{status}</span>
    </span>
  )
}
