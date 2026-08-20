import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AskPage } from './AskPage'
import { SettingsProvider } from '../shared/settings/SettingsProvider'

const streamAsk = vi.hoisted(() => vi.fn())

vi.mock('../shared/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../shared/api/client')>()
  return { ...actual, streamAsk }
})

function renderPage(entry: string) {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <SettingsProvider>
        <Routes>
          <Route path="/ask" element={<AskPage />} />
        </Routes>
      </SettingsProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  streamAsk.mockReset()
  streamAsk.mockImplementation(async function* () {
    yield { type: 'token' as const, text: 'Answered.' }
  })
})

describe('AskPage', () => {
  it('waits for a question when none was carried in', () => {
    renderPage('/ask')

    expect(streamAsk).not.toHaveBeenCalled()
    expect(screen.getByRole('textbox', { name: /ask/i })).toBeInTheDocument()
  })

  it('asks the question carried in the URL', async () => {
    renderPage('/ask?q=who%20is%20Rick%3F')

    expect(await screen.findByText('Answered.')).toBeInTheDocument()
    expect(streamAsk.mock.calls[0][0].q).toBe('who is Rick?')
  })
})
