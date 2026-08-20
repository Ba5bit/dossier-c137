import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { EpisodeCard } from './EpisodeCard'
import { EpisodeGrid } from './EpisodeGrid'
import { EpisodeFilters } from './EpisodeFilters'
import type { Episode } from '../../shared/api/types'

function episode(overrides: Partial<Episode> = {}): Episode {
  return {
    id: 1,
    name: 'Pilot',
    airDate: 'December 2, 2013',
    episode: 'S01E01',
    characterCount: 19,
    ...overrides,
  }
}

function renderCard(data: Episode) {
  return render(
    <MemoryRouter>
      <EpisodeCard episode={data} />
    </MemoryRouter>,
  )
}

describe('EpisodeCard', () => {
  it('shows the episode code, name, and air date', () => {
    renderCard(episode())
    expect(screen.getByText('S01E01')).toBeInTheDocument()
    expect(screen.getByText('Pilot')).toBeInTheDocument()
    expect(screen.getByText('December 2, 2013')).toBeInTheDocument()
  })

  it('shows how many characters appear', () => {
    renderCard(episode())
    expect(screen.getByText('19')).toBeInTheDocument()
  })

  it('links to the episode detail route', () => {
    renderCard(episode({ id: 28 }))
    expect(screen.getByRole('link')).toHaveAttribute('href', '/episodes/28')
  })
})

function renderGrid(props: Partial<Parameters<typeof EpisodeGrid>[0]> = {}) {
  return render(
    <MemoryRouter>
      <EpisodeGrid
        episodes={[]}
        isPending={false}
        isError={false}
        onRetry={() => {}}
        {...props}
      />
    </MemoryRouter>,
  )
}

describe('EpisodeGrid', () => {
  it('renders skeletons while pending', () => {
    renderGrid({ isPending: true })
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0)
  })

  it('renders the error state on failure', () => {
    renderGrid({ isError: true })
    expect(screen.getByText('REGISTRY UNREACHABLE')).toBeInTheDocument()
  })

  it('renders the empty state when nothing matched', () => {
    renderGrid({ episodes: [] })
    expect(screen.getByText('NO RECORDS FOUND')).toBeInTheDocument()
  })

  it('renders a card per episode', () => {
    renderGrid({ episodes: [episode(), episode({ id: 2, name: 'Lawnmower Dog' })] })
    expect(screen.getByText('Pilot')).toBeInTheDocument()
    expect(screen.getByText('Lawnmower Dog')).toBeInTheDocument()
  })
})

function setupFilters(overrides = {}) {
  const onChange = vi.fn()
  const onClear = vi.fn()
  render(
    <EpisodeFilters
      filters={{ page: 1 }}
      onChange={onChange}
      onClear={onClear}
      {...overrides}
    />,
  )
  return { onChange, onClear }
}

describe('EpisodeFilters', () => {
  it('shows the current episode code', () => {
    setupFilters({ filters: { page: 1, episode: 'S03' } })
    expect(screen.getByLabelText('EPISODE CODE')).toHaveValue('S03')
  })

  it('hides the clear control when no filter is active', () => {
    setupFilters()
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
  })

  it('emits a clear request', async () => {
    const { onClear } = setupFilters({ filters: { page: 1, episode: 'S03' } })
    await userEvent.click(screen.getByRole('button', { name: /clear/i }))
    expect(onClear).toHaveBeenCalledOnce()
  })

  it('filters by season from the chip row', async () => {
    const { onChange } = setupFilters()
    await userEvent.click(screen.getByRole('button', { name: 'S03' }))
    expect(onChange).toHaveBeenCalledWith('episode', 'S03')
  })

  it('marks the season a typed episode code belongs to', () => {
    setupFilters({ filters: { page: 1, episode: 'S03E07' } })
    expect(screen.getByRole('button', { name: 'S03' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'ALL' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('clears the season filter from ALL', async () => {
    const { onChange } = setupFilters({ filters: { page: 1, episode: 'S03' } })
    await userEvent.click(screen.getByRole('button', { name: 'ALL' }))
    expect(onChange).toHaveBeenCalledWith('episode', undefined)
  })
})
