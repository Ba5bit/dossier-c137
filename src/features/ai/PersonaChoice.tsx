import { useSettings } from '../../shared/settings/useSettings'
import { PERSONAS, PERSONA_LABELS } from '../../shared/settings/settings'
import { COPY } from '../../shared/lore/copy'

/**
 * The same setting the portal gun panel writes, surfaced where it is used.
 * Switching here persists, so the archive remembers who the visitor talks to.
 */
export function PersonaChoice() {
  const { settings, setSetting } = useSettings()

  return (
    <div role="radiogroup" aria-label={COPY.ai.voiceLabel} className="flex gap-2">
      {PERSONAS.map((persona) => (
        <button
          key={persona}
          type="button"
          role="radio"
          aria-checked={settings.persona === persona}
          onClick={() => setSetting('persona', persona)}
          className={`border px-3 py-1 font-mono text-xs transition-colors ${
            settings.persona === persona
              ? 'border-accent text-accent'
              : 'text-muted border-line hover:border-accent hover:text-accent'
          }`}
        >
          {PERSONA_LABELS[persona]}
        </button>
      ))}
    </div>
  )
}
