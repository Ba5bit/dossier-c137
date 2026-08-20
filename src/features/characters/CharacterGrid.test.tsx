import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CharacterGrid } from './CharacterGrid'
import type { Character } from '../../shared/api/types'

const rick: Character = {
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
}

function renderGrid(props: Partial<Parameters<typeof CharacterGrid>[0]> = {}) {
  return render(
    <MemoryRouter>
      <CharacterGrid
        characters={[]}
        isPending={false}
        isError={false}
        onRetry={() => {}}
        {...props}
      />
    </MemoryRouter>,
  )
}

describe('CharacterGrid', () => {
  it('renders skeletons while pending', () => {
    renderGrid({ isPending: true })
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0)
  })

  it('renders no cards while pending', () => {
    renderGrid({ isPending: true, characters: [rick] })
    expect(screen.queryByText('Rick Sanchez')).not.toBeInTheDocument()
  })

  it('renders the error state on failure', () => {
    renderGrid({ isError: true })
    expect(screen.getByText('REGISTRY UNREACHABLE')).toBeInTheDocument()
  })

  it('renders the empty state when there are no results', () => {
    renderGrid({ characters: [] })
    expect(screen.getByText('NO RECORDS FOUND')).toBeInTheDocument()
  })

  it('renders a card per character', () => {
    renderGrid({ characters: [rick, { ...rick, id: 2, name: 'Morty Smith' }] })
    expect(screen.getByText('Rick Sanchez')).toBeInTheDocument()
    expect(screen.getByText('Morty Smith')).toBeInTheDocument()
  })
})
