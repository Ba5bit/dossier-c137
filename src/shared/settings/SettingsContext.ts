import { createContext } from 'react'
import type { Settings } from './settings'

export type SettingsContextValue = {
  settings: Settings
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
}

export const SettingsContext = createContext<SettingsContextValue | null>(null)
