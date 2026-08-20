import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CharacterCard } from './CharacterCard'
import type { Character } from '../../shared/api/types'

function character(overrides: Partial<Character> = {}): Character {
  return {
    id: 1,
    name: 'Rick Sanchez',
    status: 'Alive',
    species: 'Human',
    type: '',
    gender: 'Male',
    image: 'https://example.test/1.jpeg',
    origin: { name: 'Earth (C-137)', id: 1 },
    location: { name: 'Citadel of Ricks', id: 3 },
    episodeCount: 51,
    ...overrides,
  }
}

function renderCard(data: Character) {
  return render(
    <MemoryRouter>
      <CharacterCard character={data} />
    </MemoryRouter>,
  )
}

describe('CharacterCard', () => {
  it('shows the name and species', () => {
    renderCard(character())
    expect(screen.getByText('Rick Sanchez')).toBeInTheDocument()
    expect(screen.getByText('Human')).toBeInTheDocument()
  })

  it('renders the registry id in monospace archive format', () => {
    renderCard(character({ id: 7 }))
    expect(screen.getByText('REGISTRY #007')).toBeInTheDocument()
  })

  it('gives the image a meaningful alt text', () => {
    renderCard(character())
    expect(screen.getByAltText('Rick Sanchez')).toBeInTheDocument()
  })

  it('lazily loads the image with explicit dimensions', () => {
    renderCard(character())
    const image = screen.getByAltText('Rick Sanchez')
    expect(image).toHaveAttribute('loading', 'lazy')
    expect(image).toHaveAttribute('width')
    expect(image).toHaveAttribute('height')
  })

  it('links to the character detail route', () => {
    renderCard(character({ id: 42 }))
    expect(screen.getByRole('link')).toHaveAttribute('href', '/characters/42')
  })

  it('renders a redaction bar when the origin is unknown', () => {
    renderCard(character({ origin: { name: 'unknown', id: null } }))
    expect(screen.getByTestId('redacted-origin')).toBeInTheDocument()
  })

  it('shows the origin name when it is known', () => {
    renderCard(character())
    expect(screen.getByText('Earth (C-137)')).toBeInTheDocument()
    expect(screen.queryByTestId('redacted-origin')).not.toBeInTheDocument()
  })

  it('marks a deceased character for styling', () => {
    const { container } = renderCard(character({ status: 'Dead' }))
    expect(container.querySelector('[data-deceased="true"]')).toBeInTheDocument()
  })
})
