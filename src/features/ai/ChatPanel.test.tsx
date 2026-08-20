import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatPanel } from './ChatPanel'
import { SettingsProvider } from '../../shared/settings/SettingsProvider'
import type { AskEvent, AskFocus } from '../../shared/api/types'
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

function renderPanel(initialQuestion?: string, focus?: AskFocus) {
  // A focused panel names the record it is about, which is a query. No
  // retries and no shared cache, so one test cannot answer another's.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SettingsProvider>
          <ChatPanel initialQuestion={initialQuestion} focus={focus} />
        </SettingsProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  streamAsk.mockReset()
  streamAsk.mockImplementation(
    stream([
      { type: 'sources', sources: [{ type: 'character', id: 1, name: 'Rick Sanchez' }], citable: [] },
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

    expect(screen.getByText(COPY.ai.greetings.rick)).toBeInTheDocument()
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

describe('ChatPanel follow-ups', () => {
  it('offers the follow-ups the answer came with, and asks one on click', async () => {
    const user = userEvent.setup()
    streamAsk.mockImplementation(
      stream([
        { type: 'token', text: 'Wubba lubba.' },
        { type: 'suggestions', suggestions: ['Why does Rick drink?'] },
      ]),
    )
    renderPanel('who is rick?')

    const follow = await screen.findByRole('button', { name: 'Why does Rick drink?' })
    await user.click(follow)

    expect(streamAsk).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: 'Why does Rick drink?' }),
    )
  })

  it('shows no follow-up row when the answer carried none', async () => {
    renderPanel('who is rick?')

    expect(await screen.findByText('Wubba lubba.')).toBeInTheDocument()
    expect(screen.queryByText(COPY.ai.nextLabel)).not.toBeInTheDocument()
  })
})

describe('ChatPanel transcripts', () => {
  it('keeps the log across a round trip and does not pay for the question twice', async () => {
    renderPanel('who is Rick?')
    expect(await screen.findByText('Wubba lubba.')).toBeInTheDocument()
    expect(streamAsk).toHaveBeenCalledTimes(1)

    // What following a source card out and coming back does to this panel.
    cleanup()
    renderPanel('who is Rick?')

    expect(await screen.findByText('Wubba lubba.')).toBeInTheDocument()
    expect(streamAsk).toHaveBeenCalledTimes(1)
  })

  it('wipes the log without re-asking the question in the URL', async () => {
    const user = userEvent.setup()
    renderPanel('who is Rick?')
    expect(await screen.findByText('Wubba lubba.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: COPY.ai.clear }))

    expect(screen.queryByText('Wubba lubba.')).not.toBeInTheDocument()
    expect(streamAsk).toHaveBeenCalledTimes(1)
  })

  it('leaves an old answer under the voice that wrote it', async () => {
    const user = userEvent.setup()
    renderPanel('who is Rick?')
    expect(await screen.findByText('Wubba lubba.')).toBeInTheDocument()
    // The header and the answer, both Rick.
    expect(screen.getAllByText(COPY.ai.personaNames.rick)).toHaveLength(2)

    await user.click(screen.getByRole('radio', { name: 'Morty' }))

    // The header follows the setting; the answer Rick wrote stays Rick's.
    expect(screen.getByText(COPY.ai.personaNames.morty)).toBeInTheDocument()
    expect(screen.getAllByText(COPY.ai.personaNames.rick)).toHaveLength(1)
  })

  it("keeps one record's questions out of another record's log", async () => {
    renderPanel('who is Rick?', { type: 'location', id: 3 })
    expect(await screen.findByText('Wubba lubba.')).toBeInTheDocument()

    cleanup()
    renderPanel(undefined, { type: 'location', id: 9 })

    expect(screen.queryByText('Wubba lubba.')).not.toBeInTheDocument()
  })
})
