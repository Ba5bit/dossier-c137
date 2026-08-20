import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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

describe('CharacterFilters', () => {
  it('emits the typed name', async () => {
    // The input is controlled, so the caller has to feed the value back in —
    // exactly what the URL filter state does in the running app.
    const onChange = vi.fn()

    function Harness() {
      const [name, setName] = useState<string | undefined>(undefined)
      return (
        <CharacterFilters
          filters={{ page: 1, name }}
          onChange={(key, value) => {
            onChange(key, value)
            if (key === 'name') setName(value)
          }}
          onClear={() => {}}
        />
      )
    }

    render(<Harness />)
    await userEvent.type(screen.getByLabelText('Search by name'), 'rick')
    expect(onChange).toHaveBeenLastCalledWith('name', 'rick')
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
