import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { COPY } from '../lore/copy'

export type CarouselPage = {
  key: string
  /** Printed beside the pager, so the visitor knows which slice this is. */
  label?: string
  content: ReactNode
}

type CarouselProps = {
  title: string
  pages: CarouselPage[]
  /** Shown in place of the track when there is nothing to page through. */
  empty?: ReactNode
}

const ARROW =
  'flex h-8 w-8 items-center justify-center border border-line font-mono ' +
  'text-xs text-muted transition-colors hover:border-accent hover:text-accent ' +
  'disabled:text-line disabled:hover:border-line'

/**
 * A dossier can hold fifty episodes or a hundred residents, and printing all
 * of them stacks a page the visitor has to scroll past to reach anything
 * else. The same records go into one viewport-wide track: arrows on a
 * desktop, an ordinary swipe on a phone, since the track is a real scroll
 * container with snap points rather than a transform.
 */
export function Carousel({ title, pages, empty }: CarouselProps) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [index, setIndex] = useState(0)

  const pageCount = pages.length
  const current = Math.min(index, Math.max(pageCount - 1, 0))

  function scrollTo(next: number) {
    const track = trackRef.current
    setIndex(next)
    if (!track) return

    const left = next * track.clientWidth
    // jsdom, and older Safari, have no smooth scroll on an element.
    if (typeof track.scrollTo === 'function') {
      track.scrollTo({ left, behavior: 'smooth' })
    } else {
      track.scrollLeft = left
    }
  }

  function onScroll() {
    const track = trackRef.current
    if (!track || track.clientWidth === 0) return
    setIndex(Math.round(track.scrollLeft / track.clientWidth))
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-mono text-xs tracking-widest text-muted">{title}</h2>

        {pageCount > 1 && (
          <div className="flex items-center gap-2">
            {pages[current]?.label && (
              <span className="font-mono text-xs tracking-widest text-accent">
                {pages[current].label}
              </span>
            )}
            <span className="font-mono text-xs text-muted">
              {COPY.carousel.position(current + 1, pageCount)}
            </span>
            <button
              type="button"
              aria-label={COPY.carousel.previous}
              disabled={current === 0}
              onClick={() => scrollTo(current - 1)}
              className={ARROW}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label={COPY.carousel.next}
              disabled={current >= pageCount - 1}
              onClick={() => scrollTo(current + 1)}
              className={ARROW}
            >
              ›
            </button>
          </div>
        )}
      </div>

      {pageCount === 0
        ? empty
        : (
          <div
            ref={trackRef}
            onScroll={onScroll}
            data-testid="carousel-track"
            className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
          >
            {pages.map((page) => (
              <div key={page.key} className="w-full shrink-0 snap-start">
                {page.content}
              </div>
            ))}
          </div>
        )}
    </section>
  )
}
