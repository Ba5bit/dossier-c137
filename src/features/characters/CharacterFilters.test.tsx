import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CharacterFilters } from './CharacterFilters'

function setup(overrides = {}) {
  const onChange = vi.fn()
  const onClear = vi.fn()
  render(
    <CharacterFilters
      filters={{ page: 1 }}
      onChange={onChange}
      onClear={onClear}
      {...overrides}
    />,
  )
  return { onChange, onClear }
}

function renderFilters(filters: Parameters<typeof CharacterFilters>[0]['filters']) {
  const view = render(
    <CharacterFilters filters={filters} onChange={vi.fn()} onClear={vi.fn()} />,
  )
  return {
    rerender: (next: typeof filters) =>
      view.rerender(
        <CharacterFilters filters={next} onChange={vi.fn()} onClear={vi.fn()} />,
      ),
  }
}

describe('CharacterFilters', () => {
  it('emits the typed name once the typing settles', async () => {
    const { onChange } = setup()
    await userEvent.type(screen.getByLabelText('Search by name'), 'rick')
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith('name', 'rick'),
    )
  })

  it('keeps every keystroke even though the URL lags behind', async () => {
    // The filters prop never updates here, mimicking a slow round trip
    // through the router. The draft must survive it.
    setup()
    const input = screen.getByLabelText('Search by name')
    await userEvent.type(input, 'morty')
    expect(input).toHaveValue('morty')
  })

  it('does not navigate on every keystroke', async () => {
    const { onChange } = setup()
    await userEvent.type(screen.getByLabelText('Search by name'), 'rick')
    await waitFor(() => expect(onChange).toHaveBeenCalled())
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('adopts a name cleared from outside the component', async () => {
    const { rerender } = renderFilters({ page: 1, name: 'rick' })
    expect(screen.getByLabelText('Search by name')).toHaveValue('rick')
    rerender({ page: 1 })
    await waitFor(() =>
      expect(screen.getByLabelText('Search by name')).toHaveValue(''),
    )
  })

  it('shows the current name value', () => {
    setup({ filters: { page: 1, name: 'morty' } })
    expect(screen.getByLabelText('Search by name')).toHaveValue('morty')
  })

  it('emits the selected status', async () => {
    const { onChange } = setup()
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'dead')
    expect(onChange).toHaveBeenCalledWith('status', 'dead')
  })

  it('emits undefined when a select is reset to any', async () => {
    const { onChange } = setup({ filters: { page: 1, status: 'dead' } })
    await userEvent.selectOptions(screen.getByLabelText('Status'), '')
    expect(onChange).toHaveBeenCalledWith('status', undefined)
  })

  it('emits the selected gender', async () => {
    const { onChange } = setup()
    await userEvent.selectOptions(screen.getByLabelText('Gender'), 'female')
    expect(onChange).toHaveBeenCalledWith('gender', 'female')
  })

  it('hides the clear control when no filter is active', () => {
    setup()
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
  })

  it('shows the clear control when a filter is active', () => {
    setup({ filters: { page: 1, status: 'alive' } })
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
  })

  it('emits a clear request', async () => {
    const { onClear } = setup({ filters: { page: 1, status: 'alive' } })
    await userEvent.click(screen.getByRole('button', { name: /clear/i }))
    expect(onClear).toHaveBeenCalledOnce()
  })

  it('does not treat page alone as an active filter', () => {
    setup({ filters: { page: 5 } })
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
  })
})
