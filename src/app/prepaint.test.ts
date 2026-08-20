import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { SETTINGS_KEY } from '../shared/settings/settings'

const html = readFileSync('index.html', 'utf8')

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
