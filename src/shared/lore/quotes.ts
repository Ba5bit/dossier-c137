/**
 * Shown beneath the vortex only when a request outlives 1.5 s, so a fast
 * response never flashes text on screen.
 */
export const QUOTES = [
  'Recalibrating. Do not look directly at the fluid.',
  'Crossing dimensions. Statistically, most of them are worse.',
  'Interdimensional customs is slow today.',
  'Hold still. This part is technically illegal in nine realities.',
  "Rerouting around a dimension where this archive doesn't exist.",
  'The Council of Ricks is reviewing your clearance. Ignore them.',
  'Almost. Try not to think about the other you.',
  'Portal fluid is cheap. Your patience is cheaper.',
]

export function pickQuote(random: () => number = Math.random): string {
  return QUOTES[Math.floor(random() * QUOTES.length)]
}
