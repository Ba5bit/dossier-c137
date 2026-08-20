import { COPY } from '../lore/copy'

type ErrorStateProps = {
  message?: string
  onRetry: () => void
}

export function ErrorState({
  message = COPY.states.errorMessage,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="border border-dead bg-surface px-6 py-16 text-center">
      <p className="font-mono text-sm text-dead">{COPY.states.errorTitle}</p>
      <p className="mt-3 text-fg">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 border border-line px-4 py-2 font-mono text-xs text-fg transition-colors hover:border-accent hover:text-accent"
      >
        {COPY.states.errorRetry}
      </button>
    </div>
  )
}
