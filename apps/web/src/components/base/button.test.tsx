import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Button } from './button';
import React from 'react';

describe('Button', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('calls onPress when clicked', () => {
    const onPress = vi.fn();
    render(<Button onPress={onPress}>Click me</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when isDisabled prop is true', () => {
    const onPress = vi.fn();
    render(<Button isDisabled onPress={onPress}>Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows loading state when isLoading is true', () => {
    render(<Button isLoading>Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('renders startContent', () => {
    render(<Button startContent={<span data-testid="icon">Icon</span>}>Click me</Button>);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('handles isIconOnly', () => {
    render(<Button isIconOnly aria-label="Icon Button">X</Button>);
    const button = screen.getByRole('button', { name: "Icon Button" });
    expect(button).toBeInTheDocument();
  });

  it('renders as a div when as="div"', () => {
    render(<Button as="div">Click me</Button>);
    const element = screen.getByText('Click me');
    expect(element.tagName).toBe('DIV');
  });

  it('forwards ref', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Click me</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
