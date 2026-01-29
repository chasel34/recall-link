import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { Textarea } from './textarea'
import * as React from 'react'

describe('Textarea', () => {
  afterEach(cleanup)

  it('renders textarea with placeholder', () => {
    render(<Textarea placeholder="Type something..." />)
    expect(screen.getByPlaceholderText('Type something...')).toBeInTheDocument()
  })

  it('handles controlled value changes', () => {
    const handleChange = vi.fn()
    const { rerender } = render(<Textarea value="" onValueChange={handleChange} />)
    
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Hello' } })
    
    expect(handleChange).toHaveBeenCalledWith('Hello')
    
    rerender(<Textarea value="Hello" onValueChange={handleChange} />)
    expect(textarea).toHaveValue('Hello')
  })

  it('forwards ref to textarea element', () => {
    const ref = React.createRef<HTMLTextAreaElement>()
    render(<Textarea ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement)
  })

  it('applies custom classNames', () => {
    render(
      <Textarea 
        classNames={{ 
          input: 'custom-input', 
          inputWrapper: 'custom-wrapper' 
        }} 
        data-testid="wrapper"
      />
    )
    
    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveClass('custom-input')
    
    const wrapper = textarea.parentElement
    expect(wrapper).toHaveClass('custom-wrapper')
  })

  it('respects minRows prop', () => {
    render(<Textarea minRows={3} />)
    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveAttribute('rows', '3')
  })
})
