import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useIsFetching } from '@tanstack/react-query'
import { PortalContext } from './PortalContext'
import { PortalOverlay } from './PortalOverlay'
import { usePortalMachine } from './usePortalMachine'
import { pickQuote } from '../lore/quotes'

export function PortalProvider({ children }: { children: ReactNode }) {
  const { phase, variant, showQuote, open, arrive } = usePortalMachine()
  const fetching = useIsFetching()
  const [quote, setQuote] = useState<string | null>(null)

  /**
   * The request is whatever the destination page starts. When nothing is in
   * flight any more, the traversal is over — including the cache-hit case,
   * where nothing was ever in flight and the 300 ms floor carries the shot
   * on its own.
   */
  useEffect(() => {
    if (phase !== 'traversing') return
    if (fetching > 0) return
    arrive()
  }, [phase, fetching, arrive])

  useEffect(() => {
    setQuote(showQuote ? pickQuote() : null)
  }, [showQuote])

  const value = useMemo(() => ({ open }), [open])

  return (
    <PortalContext.Provider value={value}>
      {children}
      <PortalOverlay phase={phase} variant={variant} quote={quote} />
    </PortalContext.Provider>
  )
}
