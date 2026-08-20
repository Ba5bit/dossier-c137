type EmptyStateProps = {
  message?: string
}

export function EmptyState({
  message = 'Oooh, nothing here! Existence is pain!',
}: EmptyStateProps) {
  return (
    <div className="border border-line bg-surface px-6 py-16 text-center">
      <p className="font-mono text-sm text-muted">NO RECORDS FOUND</p>
      <p className="mt-3 text-fg">{message}</p>
    </div>
  )
}
