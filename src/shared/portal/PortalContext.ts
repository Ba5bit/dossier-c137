import { createContext } from 'react'
import type { PortalVariant } from './usePortalMachine'

export type PortalContextValue = {
  open: (variant?: PortalVariant) => void
}

export const PortalContext = createContext<PortalContextValue | null>(null)
