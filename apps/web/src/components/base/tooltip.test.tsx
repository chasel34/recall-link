import { render, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import { Tooltip } from './tooltip'

describe('Tooltip', () => {
  afterEach(cleanup)

  it('renders children', () => {
    render(
      <Tooltip content="Tooltip content">
        <button>Trigger</button>
      </Tooltip>
    )
    expect(screen.getByText('Trigger')).toBeDefined()
  })
})
