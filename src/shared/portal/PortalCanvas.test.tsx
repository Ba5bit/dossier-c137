import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PortalCanvas } from './PortalCanvas'

/**
 * jsdom returns null from getContext('2d') — the optional `canvas` package is
 * not installed and does not need to be. This proxy accepts any method call
 * and any property assignment, which is all the drawing code does.
 */
function stubContext() {
  const context = new Proxy(
    {},
    {
      get: () => () => undefined,
      set: () => true,
    },
  ) as unknown as CanvasRenderingContext2D

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context)
}

let frames: FrameRequestCallback[] = []

beforeEach(() => {
  stubContext()
  frames = []
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.push(callback)
    return frames.length
  })
  vi.stubGlobal('cancelAnimationFrame', () => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => hidden,
  })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('PortalCanvas', () => {
  it('renders a decorative canvas at the requested size', () => {
    render(<PortalCanvas size={280} />)

    const canvas = screen.getByTestId('portal-canvas')
    expect(canvas).toHaveAttribute('width', '280')
    expect(canvas).toHaveAttribute('aria-hidden', 'true')
  })

  it('starts a frame loop', () => {
    render(<PortalCanvas size={120} />)

    expect(frames.length).toBe(1)
  })

  it('keeps drawing frame after frame', () => {
    render(<PortalCanvas size={120} />)

    frames[0](16)

    expect(frames.length).toBe(2)
  })

  it('halts the loop when the tab goes away', () => {
    render(<PortalCanvas size={120} />)
    frames[0](16)
    const before = frames.length

    setHidden(true)
    frames[before - 1](32)

    // The frame that was already queued runs, but the loop must not queue
    // another one: a hidden tab has nothing to animate.
    expect(frames.length).toBe(before)
    setHidden(false)
  })
})
