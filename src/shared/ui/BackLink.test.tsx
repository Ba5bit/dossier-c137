import { afterEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { BackLink } from './BackLink'

function renderAt(entries: string[]) {
  render(
    <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
      <Routes>
        <Route path="/" element={<p>HUB</p>} />
        <Route path="/characters" element={<p>LIST</p>} />
        <Route path="/characters/:id" element={<BackLink />} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  window.history.replaceState(null, '')
})

describe('BackLink', () => {
  it('returns to the page the visitor came from', async () => {
    const user = userEvent.setup()
    renderAt(['/characters', '/characters/35'])

    await user.click(screen.getByRole('button', { name: 'Go back' }))

    expect(screen.getByText('LIST')).toBeInTheDocument()
  })

  it('falls back to the hub rather than leaving the site', async () => {
    const user = userEvent.setup()
    // What the browser leaves behind on a dossier opened in a fresh tab:
    // an entry with nothing before it.
    window.history.replaceState({ idx: 0 }, '')
    renderAt(['/characters/35'])

    await user.click(screen.getByRole('button', { name: 'Go back' }))

    expect(screen.getByText('HUB')).toBeInTheDocument()
  })
})
