import { useEffect, useRef, useState } from 'react'
import { useSettings } from './useSettings'
import {
  DIMENSIONS,
  DIMENSION_LABELS,
  MOTION_PREFERENCES,
  PERSONAS,
  PERSONA_LABELS,
} from './settings'
import type { MotionPreference } from './settings'

type SettingsPanelProps = {
  onClose: () => void
}

const MOTION_LABELS: Record<MotionPreference, string> = {
  auto: 'AUTO',
  on: 'ON',
  off: 'OFF',
}

/**
 * Three tabs rather than five stacked rows. The panel used to print every
 * setting at once, which made it tall enough to cover the page behind it —
 * and dimension, voice and motion have nothing to do with one another.
 */
const TABS = [
  { id: 'dimension', label: 'DIMENSION' },
  { id: 'voice', label: 'AI VOICE' },
  { id: 'motion', label: 'MOTION' },
] as const

type TabId = (typeof TABS)[number]['id']

const LABEL = 'font-mono text-xs tracking-widest text-muted'
const CONTROL =
  'border border-line px-3 py-2 font-mono text-xs text-fg transition-colors ' +
  'hover:border-accent hover:text-accent'
const ACTIVE = 'border-accent bg-accent/10 text-accent'
const ROW = 'flex items-center justify-between gap-4 py-2'

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { settings, setSetting } = useSettings()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [tab, setTab] = useState<TabId>('dimension')

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  function cycleMotion() {
    const index = MOTION_PREFERENCES.indexOf(settings.reducedMotion)
    setSetting(
      'reducedMotion',
      MOTION_PREFERENCES[(index + 1) % MOTION_PREFERENCES.length],
    )
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Portal settings"
      tabIndex={-1}
      // Styled as the gun's housing: a raised panel with a hard border, which
      // is the single idea taken from design reference 07.
      className="w-[19rem] border border-line bg-raised p-4 shadow-xl outline-none"
    >
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-xs tracking-widest text-accent">
          PORTAL SETTINGS
        </p>
        <button
          type="button"
          aria-label="Close settings"
          onClick={onClose}
          className="font-mono text-xs text-muted transition-colors hover:text-accent"
        >
          ✕
        </button>
      </div>

      <div role="tablist" aria-label="Settings sections" className="mt-3 flex gap-1">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={tab === entry.id}
            onClick={() => setTab(entry.id)}
            className={`flex-1 border px-2 py-2 font-mono text-[10px] tracking-widest transition-colors ${
              tab === entry.id
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-line text-muted hover:border-accent hover:text-accent'
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="mt-3 border-t border-line pt-2">
        {tab === 'dimension' && (
          <div
            role="radiogroup"
            aria-label="DIMENSION"
            className="flex flex-col gap-2 py-1"
          >
            {DIMENSIONS.map((dimension) => (
              <button
                key={dimension}
                type="button"
                role="radio"
                aria-checked={settings.dimension === dimension}
                onClick={() => setSetting('dimension', dimension)}
                className={`${CONTROL} w-full text-left ${
                  settings.dimension === dimension ? ACTIVE : ''
                }`}
              >
                {DIMENSION_LABELS[dimension]}
              </button>
            ))}
          </div>
        )}

        {tab === 'voice' && (
          <div className={ROW}>
            <span className={LABEL} id="settings-persona">
              AI VOICE
            </span>
            <div
              role="radiogroup"
              aria-labelledby="settings-persona"
              className="flex gap-2"
            >
              {PERSONAS.map((persona) => (
                <button
                  key={persona}
                  type="button"
                  role="radio"
                  aria-checked={settings.persona === persona}
                  onClick={() => setSetting('persona', persona)}
                  className={`${CONTROL} ${
                    settings.persona === persona ? ACTIVE : ''
                  }`}
                >
                  {PERSONA_LABELS[persona]}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'motion' && (
          <>
            <div className={`${ROW} border-b border-line`}>
              <span className={LABEL} aria-hidden="true">
                PORTAL TRANSITIONS
              </span>
              <button
                type="button"
                aria-label="PORTAL TRANSITIONS"
                aria-pressed={settings.portalTransitions}
                onClick={() =>
                  setSetting('portalTransitions', !settings.portalTransitions)
                }
                className={CONTROL}
              >
                {settings.portalTransitions ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className={ROW}>
              <span className={LABEL} aria-hidden="true">
                REDUCED MOTION
              </span>
              <button
                type="button"
                aria-label="REDUCED MOTION"
                onClick={cycleMotion}
                className={CONTROL}
              >
                {MOTION_LABELS[settings.reducedMotion]}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
