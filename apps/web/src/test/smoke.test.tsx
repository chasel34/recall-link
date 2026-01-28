import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('web test setup', () => {
  it('renders a simple element', () => {
    render(<div>Recall Link</div>)

    expect(screen.getByText('Recall Link')).toBeInTheDocument()
  })
})
