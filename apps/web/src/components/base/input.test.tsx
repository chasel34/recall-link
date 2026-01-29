import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Input } from './input'

describe('Base Input', () => {
  afterEach(cleanup)

  it('renders with value and placeholder', () => {
    render(<Input value="test value" onValueChange={() => {}} placeholder="Enter text" />)
    const input = screen.getByPlaceholderText('Enter text') as HTMLInputElement
    expect(input.value).toBe('test value')
  })

  it('calls onValueChange when typing', () => {
    const handleChange = vi.fn()
    render(<Input value="" onValueChange={handleChange} placeholder="Type here" />)
    const input = screen.getByPlaceholderText('Type here')
    fireEvent.change(input, { target: { value: 'hello' } })
    expect(handleChange).toHaveBeenCalledWith('hello')
  })

  it('renders startContent', () => {
    render(
      <Input 
        value="" 
        onValueChange={() => {}} 
        startContent={<span data-testid="start-icon">Icon</span>} 
      />
    )
    expect(screen.getByTestId('start-icon')).toBeInTheDocument()
  })

  it('clears value when clear button is clicked', () => {
    const handleChange = vi.fn()
    render(<Input value="some text" onValueChange={handleChange} isClearable />)
    const clearBtn = screen.getByLabelText('Clear')
    fireEvent.click(clearBtn)
    expect(handleChange).toHaveBeenCalledWith('')
  })

  it('shows error message when isInvalid is true', () => {
    render(
      <Input 
        value="" 
        onValueChange={() => {}} 
        isInvalid={true} 
        errorMessage="Something went wrong" 
      />
    )
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('applies wrapper classes via classNames', () => {
    const { container } = render(
      <Input 
        value="" 
        onValueChange={() => {}} 
        classNames={{ inputWrapper: 'custom-wrapper-class' }} 
      />
    )
    expect(container.querySelector('.custom-wrapper-class')).toBeInTheDocument()
  })

  it('supports autoFocus', () => {
    render(<Input value="" onValueChange={() => {}} autoFocus />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveFocus()
  })
})
