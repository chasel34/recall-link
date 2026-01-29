import { render, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach, beforeAll } from 'vitest'
import { ScrollShadow } from './scroll-shadow'

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('ScrollShadow', () => {
  beforeAll(() => {
    window.ResizeObserver = ResizeObserver
  })
  
  afterEach(cleanup)

  it('renders children', () => {
    render(
      <ScrollShadow>
        <div>Content</div>
      </ScrollShadow>
    )
    expect(screen.getByText('Content')).toBeDefined()
  })
})
