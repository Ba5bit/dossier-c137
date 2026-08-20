import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Pagination } from './Pagination'

describe('Pagination', () => {
  it('reports the position in archive wording', () => {
    render(<Pagination page={3} pageCount={42} onChange={() => {}} />)
    expect(screen.getByText('DIMENSION 3 / 42')).toBeInTheDocument()
  })

  it('disables the previous control on the first page', () => {
    render(<Pagination page={1} pageCount={42} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()
  })

  it('disables the next control on the last page', () => {
    render(<Pagination page={42} pageCount={42} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })

  it('enables both controls in the middle', () => {
    render(<Pagination page={20} pageCount={42} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /previous/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /next/i })).toBeEnabled()
  })

  it('emits the next page number', async () => {
    const onChange = vi.fn()
    render(<Pagination page={5} pageCount={42} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(onChange).toHaveBeenCalledWith(6)
  })

  it('emits the previous page number', async () => {
    const onChange = vi.fn()
    render(<Pagination page={5} pageCount={42} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /previous/i }))
    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('renders nothing when there is only one page', () => {
    const { container } = render(
      <Pagination page={1} pageCount={1} onChange={() => {}} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
