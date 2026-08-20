import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from './AppLayout'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/characters" element={<p>characters outlet</p>} />
          <Route path="/locations" element={<p>locations outlet</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('AppLayout', () => {
  it('offers a link to each section', () => {
    renderAt('/characters')
    expect(screen.getByRole('link', { name: 'CHARACTERS' })).toHaveAttribute(
      'href',
      '/characters',
    )
    expect(screen.getByRole('link', { name: 'LOCATIONS' })).toHaveAttribute(
      'href',
      '/locations',
    )
    expect(screen.getByRole('link', { name: 'EPISODES' })).toHaveAttribute(
      'href',
      '/episodes',
    )
  })

  it('marks the active section', () => {
    renderAt('/locations')
    expect(screen.getByRole('link', { name: 'LOCATIONS' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'CHARACTERS' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('renders the routed page inside the shell', () => {
    renderAt('/characters')
    expect(screen.getByText('characters outlet')).toBeInTheDocument()
  })
})
