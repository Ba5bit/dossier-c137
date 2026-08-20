import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { SettingsContext } from './SettingsContext'
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  parseSettings,
  serializeSettings,
} from './settings'
import type { Settings } from './settings'

function readStoredSettings(): Settings {
  try {
    return parseSettings(localStorage.getItem(SETTINGS_KEY))
  } catch {
    // Private-mode browsers throw on access rather than returning null.
    return DEFAULT_SETTINGS
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(readStoredSettings)

  const setSetting = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((current) => ({ ...current, [key]: value }))
    },
    [],
  )

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, serializeSettings(settings))
    } catch {
      // A blocked or full store costs persistence, not the session.
    }
  }, [settings])

  useEffect(() => {
    // The same attribute the pre-paint script sets, so the two never disagree.
    document.documentElement.setAttribute('data-dimension', settings.dimension)
  }, [settings.dimension])

  const value = useMemo(() => ({ settings, setSetting }), [settings, setSetting])

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  )
}
