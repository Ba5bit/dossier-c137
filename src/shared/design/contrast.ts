/**
 * The dimensions are defined once, in CSS, and read from there — a second
 * copy of the palette in TypeScript would be the thing that drifts.
 */
export type Tokens = Record<string, string>

const BLOCK = /(?::root,\s*)?\[data-dimension="([^"]+)"\]\s*\{([^}]*)\}/g
const VARIABLE = /--([a-z-]+):\s*(#[0-9A-Fa-f]{6})/g

export function parseDimensions(css: string): Record<string, Tokens> {
  const dimensions: Record<string, Tokens> = {}

  for (const [, name, body] of css.matchAll(BLOCK)) {
    const tokens: Tokens = {}
    for (const [, key, value] of body.matchAll(VARIABLE)) tokens[key] = value
    if (Object.keys(tokens).length > 0) dimensions[name] = tokens
  }

  return dimensions
}

function channel(value: number): number {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/** WCAG 2.1 relative luminance. */
export function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrastRatio(a: string, b: string): number {
  const first = luminance(a)
  const second = luminance(b)
  const lighter = Math.max(first, second)
  const darker = Math.min(first, second)
  return (lighter + 0.05) / (darker + 0.05)
}
