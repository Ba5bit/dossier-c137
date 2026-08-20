import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useUrlFilters } from './useUrlFilters'

function Probe() {
  const { filters, setFilter, clearFilters } = useUrlFilters()
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

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/characters" element={<Probe />} />
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
})
