import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Carousel } from './Carousel'

function pages(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    key: String(index),
    label: `S0${index + 1}`,
    content: <p>page {index + 1}</p>,
  }))
}

describe('Carousel', () => {
  it('renders every page into one swipeable track', () => {
    render(<Carousel title="EPISODES" pages={pages(3)} />)

    expect(screen.getByText('page 1')).toBeInTheDocument()
    expect(screen.getByText('page 3')).toBeInTheDocument()
    expect(screen.getByTestId('carousel-track')).toBeInTheDocument()
  })

  it('hides the pager when there is only one page', () => {
    render(<Carousel title="EPISODES" pages={pages(1)} />)

    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
  })

  it('advances through the pages and stops at both ends', async () => {
    const user = userEvent.setup()
    render(<Carousel title="EPISODES" pages={pages(2)} />)

    const next = screen.getByRole('button', { name: 'Next' })
    const previous = screen.getByRole('button', { name: 'Previous' })

    expect(previous).toBeDisabled()
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
    expect(screen.getByText('S01')).toBeInTheDocument()

    await user.click(next)

    expect(screen.getByText('2 / 2')).toBeInTheDocument()
    expect(screen.getByText('S02')).toBeInTheDocument()
    expect(next).toBeDisabled()
    expect(previous).toBeEnabled()
  })

  it('shows the empty slot instead of an empty track', () => {
    render(<Carousel title="EPISODES" pages={[]} empty={<p>NOTHING ON FILE</p>} />)

    expect(screen.getByText('NOTHING ON FILE')).toBeInTheDocument()
    expect(screen.queryByTestId('carousel-track')).not.toBeInTheDocument()
  })
})
