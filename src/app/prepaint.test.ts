import { describe, it, expect } from 'vitest'
// Imported through Vite rather than read with node:fs, which would mean
// pulling in @types/node for one line.
import html from '../../index.html?raw'
import { SETTINGS_KEY } from '../shared/settings/settings'

describe('the pre-paint dimension script', () => {
  it('reads the same storage key the settings module owns', () => {
    expect(html).toContain(SETTINGS_KEY)
  })

  it('runs before the application module', () => {
    const prepaint = html.indexOf(SETTINGS_KEY)
    const entry = html.indexOf('/src/main.tsx')

    expect(prepaint).toBeGreaterThan(-1)
    expect(entry).toBeGreaterThan(-1)
    // A dimension applied after the entry point is a dimension applied after
    // the first paint, which is the flash this script exists to prevent.
    expect(prepaint).toBeLessThan(entry)
  })
})
