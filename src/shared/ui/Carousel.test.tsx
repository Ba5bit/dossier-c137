import { describe, it, expect } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Carousel } from './Carousel'

function pages(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    key: String(index),
    label: `S0${index + 1}`,
    content: <p>page {index + 1}</p>,
  }))
}

/**
 * jsdom moves nothing on its own, so the track is given a width and its
 * scroll frames are played by hand.
 */
function drivable() {
  const track = screen.getByTestId('carousel-track')
  Object.defineProperty(track, 'clientWidth', { value: 100, configurable: true })
  track.scrollTo = () => {}
  return track
}

function scrollTo(track: HTMLElement, left: number) {
  track.scrollLeft = left
  fireEvent.scroll(track)
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

  it('holds the pager still through the frames of its own smooth scroll', async () => {
    const user = userEvent.setup()
    render(<Carousel title="EPISODES" pages={pages(3)} />)
    const track = drivable()

    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('2 / 3')).toBeInTheDocument()

    // Mid-flight the counter used to fall back to 1 / 3 and re-disable the
    // previous arrow under the cursor.
    scrollTo(track, 20)
    scrollTo(track, 60)

    expect(screen.getByText('2 / 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled()

    scrollTo(track, 100)
    await waitFor(() => expect(screen.getByText('2 / 3')).toBeInTheDocument())
  })

  it('reads a swipe that overtakes the arrow it was sent by', async () => {
    const user = userEvent.setup()
    render(<Carousel title="EPISODES" pages={pages(3)} />)
    const track = drivable()

    await user.click(screen.getByRole('button', { name: 'Next' }))
    scrollTo(track, 160)
    scrollTo(track, 200)

    await waitFor(() => expect(screen.getByText('3 / 3')).toBeInTheDocument())
  })

  it('shows the empty slot instead of an empty track', () => {
    render(<Carousel title="EPISODES" pages={[]} empty={<p>NOTHING ON FILE</p>} />)

    expect(screen.getByText('NOTHING ON FILE')).toBeInTheDocument()
    expect(screen.queryByTestId('carousel-track')).not.toBeInTheDocument()
  })
})
