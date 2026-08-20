import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AnswerText } from './AnswerText'
import type { AskSource } from '../../shared/api/types'

const sources: AskSource[] = [
  { type: 'character', id: 118, name: 'Evil Morty' },
  { type: 'location', id: 3, name: 'Citadel of Ricks' },
]

function renderText(text: string, given = sources) {
  render(
    <MemoryRouter>
      <AnswerText text={text} sources={given} />
    </MemoryRouter>,
  )
}

describe('AnswerText', () => {
  it('turns a citation into a link to that record', () => {
    renderText('Evil Morty [#118] runs the Citadel [#3].')

    expect(screen.getByRole('link', { name: '#118' })).toHaveAttribute(
      'href',
      '/characters/118',
    )
    expect(screen.getByRole('link', { name: '#3' })).toHaveAttribute(
      'href',
      '/locations/3',
    )
  })

  it('drops a citation for a record this answer never retrieved', () => {
    renderText('Somebody [#999] said something.')

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText(/Somebody/)).toBeInTheDocument()
    expect(screen.queryByText('[#999]')).not.toBeInTheDocument()
  })

  it('still styles a burp as a stage direction', () => {
    renderText('Fine, *burp* whatever.')

    expect(screen.getByTestId('burp')).toBeInTheDocument()
  })
  it('links a record the answer names from inside the open dossier', () => {
    render(
      <MemoryRouter>
        <AnswerText
          text="He shows up in The Ricklantis Mixup [#28]."
          sources={sources}
          citable={[{ type: 'episode', id: 28, name: 'The Ricklantis Mixup' }]}
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: '#28' })).toHaveAttribute(
      'href',
      '/episodes/28',
    )
  })
})
