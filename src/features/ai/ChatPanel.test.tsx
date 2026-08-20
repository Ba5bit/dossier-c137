import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatPanel } from './ChatPanel'
import { SettingsProvider } from '../../shared/settings/SettingsProvider'
import type { AskEvent } from '../../shared/api/types'
import { COPY } from '../../shared/lore/copy'

const streamAsk = vi.hoisted(() => vi.fn())

vi.mock('../../shared/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../shared/api/client')>()
  return { ...actual, streamAsk }
})

function stream(events: AskEvent[]) {
  return async function* () {
    for (const event of events) yield event
  }
}

function renderPanel(initialQuestion?: string) {
  render(
    <MemoryRouter>
      <SettingsProvider>
        <ChatPanel initialQuestion={initialQuestion} />
      </SettingsProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  streamAsk.mockReset()
  streamAsk.mockImplementation(
    stream([
      { type: 'sources', sources: [{ type: 'character', id: 1, name: 'Rick Sanchez' }] },
      { type: 'token', text: 'Wubba lubba.' },
    ]),
  )
})

describe('ChatPanel', () => {
  it('offers opener questions before anything is asked, and asks one on click', async () => {
    const user = userEvent.setup()
    renderPanel()

    const opener = screen.getByRole('button', { name: COPY.ai.openers[0] })
    await user.click(opener)

    expect(streamAsk).toHaveBeenCalledWith(
      expect.objectContaining({ q: COPY.ai.openers[0], persona: 'rick' }),
    )
    // The openers belong to the empty state and must leave with it.
    expect(
      screen.queryByRole('button', { name: COPY.ai.openers[1] }),
    ).not.toBeInTheDocument()
  })

  it('greets in the selected voice before anything is asked', () => {
    renderPanel()

    expect(screen.getByText(/preferably something the archive/i)).toBeInTheDocument()
  })

  it('answers a typed question and shows its sources', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.type(screen.getByRole('textbox', { name: /ask/i }), 'who is Rick?')
    await user.click(screen.getByRole('button', { name: /send/i }))

    expect(await screen.findByText('Wubba lubba.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Rick Sanchez/ })).toHaveAttribute(
      'href',
      '/characters/1',
    )
  })

  it('asks the question it was opened with, once', async () => {
    renderPanel('who is Rick?')

    expect(await screen.findByText('Wubba lubba.')).toBeInTheDocument()
    expect(streamAsk).toHaveBeenCalledTimes(1)
  })

  it('switches voice and says so', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByRole('radio', { name: 'Morty' }))

    expect(screen.getByText(/aw jeez/i)).toBeInTheDocument()
  })

  it('shows a failure inside the conversation', async () => {
    streamAsk.mockImplementation(
      stream([{ type: 'error', code: 'RATE_LIMITED', message: 'Out of portal fluid.' }]),
    )
    const user = userEvent.setup()
    renderPanel()

    await user.type(screen.getByRole('textbox', { name: /ask/i }), 'who is Rick?')
    await user.click(screen.getByRole('button', { name: /send/i }))

    expect(await screen.findByText(/out of portal fluid/i)).toBeInTheDocument()
  })
})
