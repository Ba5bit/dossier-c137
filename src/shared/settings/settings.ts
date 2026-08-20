export type Dimension = 'c-137' | 'citadel' | 'cronenberg'
export type MotionPreference = 'auto' | 'on' | 'off'

export type Settings = {
  dimension: Dimension
  portalSfx: boolean
  portalTransitions: boolean
  reducedMotion: MotionPreference
}

/**
 * The key predates the rename from Citadel Archive. Spec section 9.2 names it
 * explicitly and the pre-paint script in index.html hardcodes it; changing it
 * would strand every existing visitor's saved dimension for no gain.
 */
export const SETTINGS_KEY = 'citadel-settings'

export const DIMENSIONS: Dimension[] = ['c-137', 'citadel', 'cronenberg']

export const DIMENSION_LABELS: Record<Dimension, string> = {
  'c-137': 'C-137',
  citadel: 'Citadel',
  cronenberg: 'Cronenberg-1',
}

export const MOTION_PREFERENCES: MotionPreference[] = ['auto', 'on', 'off']

export const DEFAULT_SETTINGS: Settings = {
  dimension: 'c-137',
  portalSfx: false,
  portalTransitions: true,
  reducedMotion: 'auto',
}

function isDimension(value: unknown): value is Dimension {
  return typeof value === 'string' && (DIMENSIONS as string[]).includes(value)
}

function isMotionPreference(value: unknown): value is MotionPreference {
  return (
    typeof value === 'string' && (MOTION_PREFERENCES as string[]).includes(value)
  )
}

function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

/**
 * Settings arrive from localStorage, which any visitor can edit by hand and
 * which any earlier version of this app may have written. Each field falls
 * back on its own, so one bad value never costs the user the other three.
 */
export function parseSettings(raw: string | null): Settings {
  if (!raw) return DEFAULT_SETTINGS

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return DEFAULT_SETTINGS
  }

  if (typeof parsed !== 'object' || parsed === null) return DEFAULT_SETTINGS
  const value = parsed as Record<string, unknown>

  return {
    dimension: isDimension(value.dimension)
      ? value.dimension
      : DEFAULT_SETTINGS.dimension,
    portalSfx: booleanOr(value.portalSfx, DEFAULT_SETTINGS.portalSfx),
    portalTransitions: booleanOr(
      value.portalTransitions,
      DEFAULT_SETTINGS.portalTransitions,
    ),
    reducedMotion: isMotionPreference(value.reducedMotion)
      ? value.reducedMotion
      : DEFAULT_SETTINGS.reducedMotion,
  }
}

export function serializeSettings(settings: Settings): string {
  return JSON.stringify(settings)
}
