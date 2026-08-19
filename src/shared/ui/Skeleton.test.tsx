import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Skeleton } from './Skeleton'

describe('Skeleton', () => {
  it('exposes a busy status to assistive technology', () => {
    render(<Skeleton />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('applies a caller-supplied class so it can mirror real geometry', () => {
    render(<Skeleton className="h-40 w-full" />)
    expect(screen.getByRole('status')).toHaveClass('h-40', 'w-full')
  })
})
