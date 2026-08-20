import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { useKonami } from './useKonami'

function Probe({ onMatch }: { onMatch: () => void }) {
  useKonami(onMatch)
  return <input aria-label="somewhere" />
}

describe('useKonami', () => {
  it('fires when the phrase is typed', async () => {
    const user = userEvent.setup()
    const onMatch = vi.fn()
    render(<Probe onMatch={onMatch} />)

    await user.type(screen.getByLabelText('somewhere'), 'wubbalubbadubdub')

    expect(onMatch).toHaveBeenCalledTimes(1)
  })

  it('ignores case and tolerates a false start', async () => {
    const user = userEvent.setup()
    const onMatch = vi.fn()
    render(<Probe onMatch={onMatch} />)

    await user.type(screen.getByLabelText('somewhere'), 'xyzWUBBALUBBADUBDUB')

    expect(onMatch).toHaveBeenCalledTimes(1)
  })

  it('stays quiet on a partial phrase', async () => {
    const user = userEvent.setup()
    const onMatch = vi.fn()
    render(<Probe onMatch={onMatch} />)

    await user.type(screen.getByLabelText('somewhere'), 'wubbalubba')

    expect(onMatch).not.toHaveBeenCalled()
  })
})
