// Sampled from design/references/show/portal-reference.png. Ordered from the
// outermost band inward; the widths are uneven on purpose.
const BAND_COLORS = [
  '#12300F',
  '#1E5A24',
  '#2F7A2C',
  '#4E9A2F',
  '#7FBE3A',
  '#A7CB56',
  '#CBE07A',
]

const CORE_LIGHT = '#E6F0A0'
const CORE_PALE = '#F4F6C8'
const FLECK_COLOR = '#6B4A2A'

/**
 * Deterministic, so sparks and flecks hold their places between frames
 * instead of boiling.
 */
function pseudoRandom(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453
  return value - Math.floor(value)
}

/**
 * An irregular outline. Three low-frequency terms give soft lobes; a clean
 * circle reads as a ring rather than as a tear in space.
 */
function traceLobedCircle(
  context: CanvasRenderingContext2D,
  radius: number,
  time: number,
): void {
  const STEPS = 96

  for (let step = 0; step <= STEPS; step += 1) {
    const angle = (step / STEPS) * Math.PI * 2
    const wobble =
      1 +
      0.06 * Math.sin(angle * 3 + time * 0.9) +
      0.04 * Math.sin(angle * 5 - time * 0.6) +
      0.03 * Math.sin(angle * 7 + time * 1.4)
    const distance = radius * wobble
    const x = Math.cos(angle) * distance
    const y = Math.sin(angle) * distance

    if (step === 0) context.moveTo(x, y)
    else context.lineTo(x, y)
  }

  context.closePath()
}

/**
 * The core turns faster than the bands. That differential rate is what reads
 * as depth; matching the rates flattens the whole thing.
 */
function drawCore(
  context: CanvasRenderingContext2D,
  radius: number,
  time: number,
): void {
  const ARMS = 3

  context.save()
  context.rotate(time * 2.2)
  context.lineCap = 'round'

  for (let arm = 0; arm < ARMS; arm += 1) {
    context.strokeStyle = arm % 2 === 0 ? CORE_LIGHT : CORE_PALE
    context.lineWidth = radius * 0.28
    context.beginPath()

    const offset = (arm / ARMS) * Math.PI * 2
    for (let step = 0; step <= 40; step += 1) {
      const progress = step / 40
      const angle = offset + progress * Math.PI * 1.6
      const distance = radius * (0.15 + progress * 0.85)
      const x = Math.cos(angle) * distance
      const y = Math.sin(angle) * distance

      if (step === 0) context.moveTo(x, y)
      else context.lineTo(x, y)
    }

    context.stroke()
  }

  context.restore()
}

/** Rim sparks, flaring and fading on their own clocks. */
function drawSparks(
  context: CanvasRenderingContext2D,
  radius: number,
  time: number,
): void {
  const SPARKS = 9
  context.fillStyle = '#FFFFFF'

  for (let index = 0; index < SPARKS; index += 1) {
    const seed = pseudoRandom(index)
    const flare = Math.max(0, Math.sin(time * (1.4 + seed) + index))
    if (flare <= 0.05) continue

    const angle = seed * Math.PI * 2 + time * 0.12
    const distance = radius * (0.86 + seed * 0.12)

    context.globalAlpha = flare
    context.beginPath()
    context.arc(
      Math.cos(angle) * distance,
      Math.sin(angle) * distance,
      1 + seed * 2.2,
      0,
      Math.PI * 2,
    )
    context.fill()
  }

  context.globalAlpha = 1
}

/** Core grit: the hand-painted quality survives only if the centre is dirty. */
function drawFlecks(
  context: CanvasRenderingContext2D,
  radius: number,
  time: number,
): void {
  context.fillStyle = FLECK_COLOR

  for (let index = 0; index < 24; index += 1) {
    const seed = pseudoRandom(index + 40)
    const angle = seed * Math.PI * 2 + time * 0.4
    const distance = radius * (0.2 + pseudoRandom(index + 80) * 0.9)

    context.beginPath()
    context.arc(
      Math.cos(angle) * distance,
      Math.sin(angle) * distance,
      0.6 + seed,
      0,
      Math.PI * 2,
    )
    context.fill()
  }
}

/**
 * Concentric bands of uneven width rather than a gradient. A smooth radial
 * gradient yields a neon doughnut, which spec section 8.5 rules out — and it
 * would also mean calling createRadialGradient and chaining off the result,
 * which the test's context stub cannot represent.
 */
export function drawPortal(
  context: CanvasRenderingContext2D,
  size: number,
  time: number,
): void {
  const half = size / 2
  const base = half * 0.86

  context.clearRect(0, 0, size, size)
  context.save()
  context.translate(half, half)

  for (let index = 0; index < BAND_COLORS.length; index += 1) {
    const scale = 1 - index * 0.11 - (index % 2 === 0 ? 0.02 : 0)
    context.fillStyle = BAND_COLORS[index]
    context.beginPath()
    traceLobedCircle(context, base * scale, time + index * 0.35)
    context.fill()
  }

  drawCore(context, base * 0.32, time)
  drawSparks(context, base, time)
  drawFlecks(context, base * 0.3, time)

  context.restore()
}
