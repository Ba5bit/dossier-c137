import { useEffect, useRef } from 'react'
import { drawPortal } from './drawPortal'

type PortalCanvasProps = {
  size?: number
}

export function PortalCanvas({ size = 320 }: PortalCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Held in a const so the null check narrows inside the nested render
    // function; a captured `let` would widen straight back to null.
    const context = canvas.getContext('2d')
    if (!context) return

    let frame = 0
    let origin = 0

    function render(timestamp: number) {
      // Spec section 12.2: no frames at all while the tab is hidden.
      if (document.hidden) {
        frame = 0
        return
      }
      if (origin === 0) origin = timestamp
      // The edge churns continuously, in every phase.
      drawPortal(context, size, (timestamp - origin) / 1000)
      frame = requestAnimationFrame(render)
    }

    function play() {
      frame = requestAnimationFrame(render)
    }

    function pause() {
      cancelAnimationFrame(frame)
      frame = 0
    }

    function onVisibilityChange() {
      // Spec section 12.2: the loop stops outright on a hidden tab rather
      // than trusting the browser's throttle.
      if (document.hidden) {
        pause()
        return
      }
      if (frame === 0) {
        origin = 0
        play()
      }
    }

    play()
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      pause()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [size])

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      aria-hidden="true"
      data-testid="portal-canvas"
      className="block"
    />
  )
}
