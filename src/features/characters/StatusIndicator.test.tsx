import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusIndicator } from './StatusIndicator'

describe('StatusIndicator', () => {
  it('shows a text label alongside the dot for alive', () => {
    render(<StatusIndicator status="Alive" />)
    expect(screen.getByText('Alive')).toBeInTheDocument()
  })

  it('shows a text label for dead', () => {
    render(<StatusIndicator status="Dead" />)
    expect(screen.getByText('Dead')).toBeInTheDocument()
  })

  it('shows a text label for unknown', () => {
    render(<StatusIndicator status="unknown" />)
    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })

  it('applies the alive color token', () => {
    const { container } = render(<StatusIndicator status="Alive" />)
    expect(container.querySelector('[data-status="alive"]')).toBeInTheDocument()
  })

  it('applies the dead color token regardless of casing', () => {
    const { container } = render(<StatusIndicator status="DEAD" />)
    expect(container.querySelector('[data-status="dead"]')).toBeInTheDocument()
  })

  it('falls back to unknown for an unrecognized value', () => {
    const { container } = render(<StatusIndicator status="Cronenberged" />)
    expect(container.querySelector('[data-status="unknown"]')).toBeInTheDocument()
  })
})
