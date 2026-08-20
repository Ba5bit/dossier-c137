import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { LocationCard } from './LocationCard'
import { LocationGrid } from './LocationGrid'
import { LocationFilters } from './LocationFilters'
import type { Location } from '../../shared/api/types'

function location(overrides: Partial<Location> = {}): Location {
  return {
    id: 1,
    name: 'Earth (C-137)',
    type: 'Planet',
    dimension: 'Dimension C-137',
    residentCount: 27,
    ...overrides,
  }
}

function renderCard(data: Location) {
  return render(
    <MemoryRouter>
      <LocationCard location={data} />
    </MemoryRouter>,
  )
}

describe('LocationCard', () => {
  it('shows the name, type, and resident count', () => {
    renderCard(location())
    expect(screen.getByText('Earth (C-137)')).toBeInTheDocument()
    expect(screen.getByText('Planet')).toBeInTheDocument()
    expect(screen.getByText('27')).toBeInTheDocument()
  })

  it('renders the registry id in archive format', () => {
    renderCard(location({ id: 9 }))
    expect(screen.getByText('REGISTRY #009')).toBeInTheDocument()
  })

  it('links to the location detail route', () => {
    renderCard(location({ id: 12 }))
    expect(screen.getByRole('link')).toHaveAttribute('href', '/locations/12')
  })

  it('redacts an unknown dimension', () => {
    renderCard(location({ dimension: 'unknown' }))
    expect(screen.getByTestId('redacted-dimension')).toBeInTheDocument()
  })

  it('shows a known dimension as text', () => {
    renderCard(location())
    expect(screen.getByText('Dimension C-137')).toBeInTheDocument()
    expect(screen.queryByTestId('redacted-dimension')).not.toBeInTheDocument()
  })
})

function renderGrid(props: Partial<Parameters<typeof LocationGrid>[0]> = {}) {
  return render(
    <MemoryRouter>
      <LocationGrid
        locations={[]}
        isPending={false}
        isError={false}
        onRetry={() => {}}
        {...props}
      />
    </MemoryRouter>,
  )
}

describe('LocationGrid', () => {
  it('renders skeletons while pending', () => {
    renderGrid({ isPending: true })
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0)
  })

  it('renders the error state on failure', () => {
    renderGrid({ isError: true })
    expect(screen.getByText('REGISTRY UNREACHABLE')).toBeInTheDocument()
  })

  it('renders the empty state when nothing matched', () => {
    renderGrid({ locations: [] })
    expect(screen.getByText('NO RECORDS FOUND')).toBeInTheDocument()
  })

  it('renders a card per location', () => {
    renderGrid({ locations: [location(), location({ id: 2, name: 'Abadango' })] })
    expect(screen.getByText('Earth (C-137)')).toBeInTheDocument()
    expect(screen.getByText('Abadango')).toBeInTheDocument()
  })
})

function setupFilters(overrides = {}) {
  const onChange = vi.fn()
  const onClear = vi.fn()
  render(
    <LocationFilters
      filters={{ page: 1 }}
      onChange={onChange}
      onClear={onClear}
      {...overrides}
    />,
  )
  return { onChange, onClear }
}

describe('LocationFilters', () => {
  it('shows the current dimension value', () => {
    setupFilters({ filters: { page: 1, dimension: 'C-137' } })
    expect(screen.getByLabelText('Dimension')).toHaveValue('C-137')
  })

  it('hides the clear control when no filter is active', () => {
    setupFilters()
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
  })

  it('emits a clear request', async () => {
    const { onClear } = setupFilters({ filters: { page: 1, type: 'Planet' } })
    await userEvent.click(screen.getByRole('button', { name: /clear/i }))
    expect(onClear).toHaveBeenCalledOnce()
  })

  it('does not treat page alone as an active filter', () => {
    setupFilters({ filters: { page: 4 } })
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
  })
})
