import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'

describe('EmptyState', () => {
  it('shows the archive voice for no results', () => {
    render(<EmptyState />)
    expect(
      screen.getByText('Oooh, nothing here! Existence is pain!'),
    ).toBeInTheDocument()
  })

  it('accepts a caller-supplied message', () => {
    render(<EmptyState message="No dimensions match." />)
    expect(screen.getByText('No dimensions match.')).toBeInTheDocument()
  })
})

describe('ErrorState', () => {
  it('shows the network failure message', () => {
    render(<ErrorState onRetry={() => {}} />)
    expect(
      screen.getByText('The portal fluid is out. Blame Jerry.'),
    ).toBeInTheDocument()
  })

  it('offers a retry control', async () => {
    const onRetry = vi.fn()
    render(<ErrorState onRetry={onRetry} />)
    await userEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('shows a caller-supplied message instead of the default', () => {
    render(<ErrorState message="Registry offline." onRetry={() => {}} />)
    expect(screen.getByText('Registry offline.')).toBeInTheDocument()
  })
})
