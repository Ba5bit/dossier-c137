import { useIsFetching, useQueryClient } from '@tanstack/react-query'

/**
 * Spec section 11.4: a background refresh must not replace content that is
 * already on screen. `useIsFetching` alone cannot tell a refresh from a first
 * load, so the cache is asked whether anything has data yet.
 */
export function RefreshBar() {
  const fetching = useIsFetching()
  const client = useQueryClient()

  if (fetching === 0) return null

  const hasContent = client
    .getQueryCache()
    .getAll()
    .some((query) => query.state.data !== undefined)

  if (!hasContent) return null

  return (
    <div
      role="progressbar"
      aria-label="Refreshing"
      aria-busy="true"
      className="fixed inset-x-0 top-0 z-50 h-0.5 animate-pulse bg-accent"
    />
  )
}
