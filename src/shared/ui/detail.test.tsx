import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RedactionBar } from './RedactionBar'
import { Stamp } from './Stamp'
import { DimensionNotFound } from './DimensionNotFound'
import { DetailSkeleton } from './DetailSkeleton'
import { RosterGrid } from '../../features/characters/RosterGrid'

describe('RedactionBar', () => {
  it('carries an accessible label instead of silent emptiness', () => {
    render(<RedactionBar label="Origin redacted" />)
    expect(screen.getByLabelText('Origin redacted')).toBeInTheDocument()
  })

  it('accepts a caller-supplied test id', () => {
    render(<RedactionBar label="Origin redacted" testId="redacted-origin" />)
    expect(screen.getByTestId('redacted-origin')).toBeInTheDocument()
  })
})

describe('Stamp', () => {
  it('renders its text', () => {
    render(<Stamp>TERMINATED</Stamp>)
    expect(screen.getByText('TERMINATED')).toBeInTheDocument()
  })

  it('marks the terminated tone for styling', () => {
    const { container } = render(<Stamp tone="dead">TERMINATED</Stamp>)
    expect(container.querySelector('[data-tone="dead"]')).toBeInTheDocument()
  })
})

describe('DimensionNotFound', () => {
  it('shows the 404 line in the archive voice', () => {
    render(
      <MemoryRouter>
        <DimensionNotFound />
      </MemoryRouter>,
    )
    expect(screen.getByText("This dimension doesn't exist.")).toBeInTheDocument()
  })

  it('offers a way back to the archive', () => {
    render(
      <MemoryRouter>
        <DimensionNotFound />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link')).toHaveAttribute('href', '/characters')
  })
})

describe('DetailSkeleton', () => {
  it('renders loading placeholders', () => {
    render(<DetailSkeleton />)
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0)
  })
})

describe('RosterGrid', () => {
  const people = [
    { id: 1, name: 'Rick Sanchez', status: 'Alive', image: 'https://example.test/1.jpeg' },
    { id: 2, name: 'Morty Smith', status: 'Dead', image: 'https://example.test/2.jpeg' },
  ]

  it('lists everyone under the supplied heading', () => {
    render(
      <MemoryRouter>
        <RosterGrid title="PERSONNEL PRESENT" people={people} />
      </MemoryRouter>,
    )
    expect(screen.getByText('PERSONNEL PRESENT')).toBeInTheDocument()
    expect(screen.getByText('Rick Sanchez')).toBeInTheDocument()
    expect(screen.getByText('Morty Smith')).toBeInTheDocument()
  })

  it('links each entry to its character page', () => {
    render(
      <MemoryRouter>
        <RosterGrid title="PERSONNEL PRESENT" people={people} />
      </MemoryRouter>,
    )
    expect(screen.getAllByRole('link')[0]).toHaveAttribute('href', '/characters/1')
  })

  it('says so plainly when the roster is empty', () => {
    render(
      <MemoryRouter>
        <RosterGrid title="REGISTERED RESIDENTS" people={[]} />
      </MemoryRouter>,
    )
    expect(screen.getByText('NO ONE ON RECORD')).toBeInTheDocument()
  })
})
