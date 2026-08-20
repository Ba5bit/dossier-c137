import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useUrlFilters } from './useUrlFilters'

const CHARACTER_KEYS = ['name', 'status', 'species', 'gender'] as const
const EPISODE_KEYS = ['name', 'episode'] as const

function Probe() {
  const { filters, setFilter, clearFilters } = useUrlFilters(CHARACTER_KEYS)
  const location = useLocation()

  return (
    <div>
      <span data-testid="page">{filters.page ?? 1}</span>
      <span data-testid="status">{filters.status ?? ''}</span>
      <span data-testid="search">{location.search}</span>
      <button onClick={() => setFilter('status', 'dead')}>set status</button>
      <button onClick={() => setFilter('page', '3')}>set page</button>
      <button onClick={() => clearFilters()}>clear</button>
    </div>
  )
}

function EpisodeProbe() {
  const { filters } = useUrlFilters(EPISODE_KEYS)
  return <span data-testid="episode">{filters.episode ?? ''}</span>
}

function renderAt(path: string, element = <Probe />) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/characters" element={element} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('useUrlFilters', () => {
  it('reads filters out of the query string', () => {
    renderAt('/characters?page=4&status=alive')
    expect(screen.getByTestId('page')).toHaveTextContent('4')
    expect(screen.getByTestId('status')).toHaveTextContent('alive')
  })

  it('defaults page to 1 when absent', () => {
    renderAt('/characters')
    expect(screen.getByTestId('page')).toHaveTextContent('1')
  })

  it('writes a changed filter into the URL', async () => {
    renderAt('/characters')
    await userEvent.click(screen.getByText('set status'))
    expect(screen.getByTestId('search')).toHaveTextContent('status=dead')
  })

  it('resets page to 1 when a non-page filter changes', async () => {
    renderAt('/characters?page=5')
    await userEvent.click(screen.getByText('set status'))
    expect(screen.getByTestId('page')).toHaveTextContent('1')
  })

  it('preserves the page when the page itself changes', async () => {
    renderAt('/characters?status=alive')
    await userEvent.click(screen.getByText('set page'))
    expect(screen.getByTestId('page')).toHaveTextContent('3')
    expect(screen.getByTestId('status')).toHaveTextContent('alive')
  })

  it('removes every filter on clear', async () => {
    renderAt('/characters?page=5&status=alive&name=rick')
    await userEvent.click(screen.getByText('clear'))
    expect(screen.getByTestId('search')).toHaveTextContent('')
    expect(screen.getByTestId('page')).toHaveTextContent('1')
  })

  it('reads a key set belonging to a different entity', () => {
    renderAt('/characters?episode=S03', <EpisodeProbe />)
    expect(screen.getByTestId('episode')).toHaveTextContent('S03')
  })

  it('ignores query parameters outside the declared key set', () => {
    renderAt('/characters?status=alive', <EpisodeProbe />)
    expect(screen.getByTestId('episode')).toHaveTextContent('')
  })
})
