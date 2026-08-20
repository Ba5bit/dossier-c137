import { useEffect, useRef } from 'react'
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

const ROW = 'flex items-center justify-between gap-6 border-b border-line py-3'
const LABEL = 'font-mono text-xs tracking-widest text-muted'
const CONTROL =
  'border border-line px-3 py-1 font-mono text-xs text-fg transition-colors ' +
  'hover:border-accent hover:text-accent'
const ACTIVE = 'border-accent text-accent'

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { settings, setSetting } = useSettings()
  const panelRef = useRef<HTMLDivElement | null>(null)

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
      aria-label="Portal gun settings"
      tabIndex={-1}
      // Styled as the gun's housing: a raised panel with a hard border, which
      // is the single idea taken from design reference 07.
      className="w-80 border border-line bg-raised p-4 shadow-xl outline-none"
    >
      <p className="font-mono text-xs tracking-widest text-accent">
        PORTAL GUN SETTINGS
      </p>

      <div className={ROW}>
        <span className={LABEL} id="settings-dimension">
          DIMENSION
        </span>
        <div
          role="radiogroup"
          aria-labelledby="settings-dimension"
          className="flex gap-2"
        >
          {DIMENSIONS.map((dimension) => (
            <button
              key={dimension}
              type="button"
              role="radio"
              aria-checked={settings.dimension === dimension}
              onClick={() => setSetting('dimension', dimension)}
              className={`${CONTROL} ${settings.dimension === dimension ? ACTIVE : ''}`}
            >
              {DIMENSION_LABELS[dimension]}
            </button>
          ))}
        </div>
      </div>

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
              className={`${CONTROL} ${settings.persona === persona ? ACTIVE : ''}`}
            >
              {PERSONA_LABELS[persona]}
            </button>
          ))}
        </div>
      </div>

      <div className={ROW}>
        <span className={LABEL} aria-hidden="true">
          PORTAL SFX
        </span>
        <button
          type="button"
          aria-label="PORTAL SFX"
          aria-pressed={settings.portalSfx}
          onClick={() => setSetting('portalSfx', !settings.portalSfx)}
          className={CONTROL}
        >
          {settings.portalSfx ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className={ROW}>
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

      <div className="flex items-center justify-between gap-6 py-3">
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

      <button
        type="button"
        onClick={onClose}
        className="mt-2 w-full border border-line py-2 font-mono text-xs text-muted transition-colors hover:border-accent hover:text-accent"
      >
        CLOSE
      </button>
    </div>
  )
}
