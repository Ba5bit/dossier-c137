import { useContext } from 'react'
import { SettingsContext } from './SettingsContext'
import { DEFAULT_SETTINGS } from './settings'
import type { SettingsContextValue } from './SettingsContext'

/**
 * Outside a provider this returns the defaults with an inert setter rather
 * than throwing. Entity cards reach the settings layer through PortalLink and
 * are rendered bare in their own tests; a throwing hook would mean wrapping
 * four test files in provider boilerplate just to assert an href.
 */
const FALLBACK: SettingsContextValue = {
  settings: DEFAULT_SETTINGS,
  setSetting: () => {},
}

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext) ?? FALLBACK
}
