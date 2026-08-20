import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { useScrollToTop } from './useScrollToTop'

function Shell() {
  useScrollToTop()

  return (
    <>
      <Link to="/characters/1">to dossier</Link>
      <Link to="/characters?page=2">to page two</Link>
      <Routes>
        <Route path="/characters" element={<p>roster</p>} />
        <Route path="/characters/:id" element={<p>dossier</p>} />
      </Routes>
    </>
  )
}

const scrollTo = vi.fn()

beforeEach(() => {
  scrollTo.mockClear()
  vi.stubGlobal('scrollTo', scrollTo)
})

afterEach(() => vi.unstubAllGlobals())

describe('useScrollToTop', () => {
  it('starts a new route at the top of the document', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/characters']}>
        <Shell />
      </MemoryRouter>,
    )

    scrollTo.mockClear()
    await user.click(screen.getByText('to dossier'))

    expect(screen.getByText('dossier')).toBeInTheDocument()
    expect(scrollTo).toHaveBeenCalled()
  })

  it('takes scroll restoration off the browser, which would otherwise win', () => {
    // jsdom has no scrollRestoration at all, so the property a real browser
    // ships has to be put there before the hook can be seen turning it off.
    Object.defineProperty(window.history, 'scrollRestoration', {
      value: 'auto',
      writable: true,
      configurable: true,
    })

    render(
      <MemoryRouter initialEntries={['/characters']}>
        <Shell />
      </MemoryRouter>,
    )

    expect(history.scrollRestoration).toBe('manual')
  })

  it('does the same for a page turn, which lives in the query string', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/characters']}>
        <Shell />
      </MemoryRouter>,
    )

    scrollTo.mockClear()
    await user.click(screen.getByText('to page two'))

    expect(scrollTo).toHaveBeenCalled()
  })
})
