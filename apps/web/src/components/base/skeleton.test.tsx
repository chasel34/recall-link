import { render, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import { Skeleton } from './skeleton'

describe('Skeleton', () => {
  afterEach(cleanup)

  it('renders', () => {
    render(<Skeleton data-testid="skeleton" />)
    expect(screen.getByTestId('skeleton')).toBeDefined()
  })
})
