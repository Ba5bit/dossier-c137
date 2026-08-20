import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * A single-page app keeps the window scroll position across a navigation, so
 * arriving on a new page halfway down it is the default rather than the
 * exception. Every route change starts at the top of the document; the
 * browser's own back/forward restoration is given up deliberately, because a
 * page that opens mid-list reads as a broken render.
 */
export function scrollToTop(): void {
  if (typeof window === 'undefined') return
  // A test environment has the method but no layout behind it.
  try {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  } catch {
    window.scrollTo(0, 0)
  }
}

export function useScrollToTop(): void {
  const { pathname, search } = useLocation()

  useEffect(() => {
    // Without this, back and forward still land mid-page: the browser
    // restores the scroll offset it remembered for that history entry, and it
    // does so after this effect has already run, so it wins. Manual mode
    // hands the decision to the effect below for every kind of navigation.
    if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
      history.scrollRestoration = 'manual'
    }
  }, [])

  useEffect(() => {
    scrollToTop()
    // The search string is included because pagination lives in the query
    // string: page 2 is a new page and belongs at the top like any other.
  }, [pathname, search])
}
