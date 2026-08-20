import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HistoryNav } from './HistoryNav'

function renderAt(entries: string[], index = entries.length - 1) {
  return render(
    <MemoryRouter initialEntries={entries} initialIndex={index}>
      <HistoryNav />
      <Routes>
        <Route path="/" element={<p>hub</p>} />
        <Route path="/characters" element={<p>roster</p>} />
        <Route path="/characters/:id" element={<p>dossier</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('HistoryNav', () => {
  it('walks back through the history', async () => {
    const user = userEvent.setup()
    renderAt(['/characters', '/characters/1'])

    expect(screen.getByText('dossier')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Go back' }))

    expect(screen.getByText('roster')).toBeInTheDocument()
  })

  it('walks forward again', async () => {
    const user = userEvent.setup()
    renderAt(['/characters', '/characters/1'])

    await user.click(screen.getByRole('button', { name: 'Go back' }))
    await user.click(screen.getByRole('button', { name: 'Go forward' }))

    expect(screen.getByText('dossier')).toBeInTheDocument()
  })

  it('prints the trail of where the visitor is', () => {
    renderAt(['/characters/12'])
    expect(screen.getByText('CHARACTERS / #12')).toBeInTheDocument()
  })

  it('stays off the hub, which is where back would lead anyway', () => {
    renderAt(['/'])
    expect(screen.queryByRole('button', { name: 'Go back' })).not.toBeInTheDocument()
  })
})
