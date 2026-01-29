import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { Tabs, Tab } from './tabs'

describe('Tabs', () => {
  afterEach(cleanup)

  it('renders tab titles', () => {
    render(
      <Tabs selectedKey="t1">
        <Tab key="t1" title="Tab 1" />
        <Tab key="t2" title="Tab 2" />
      </Tabs>
    )
    expect(screen.getByText('Tab 1')).toBeDefined()
    expect(screen.getByText('Tab 2')).toBeDefined()
  })

  it('calls onSelectionChange when clicked', () => {
    const onChange = vi.fn()
    render(
      <Tabs selectedKey="t1" onSelectionChange={onChange}>
        <Tab key="t1" title="Tab 1" />
        <Tab key="t2" title="Tab 2" />
      </Tabs>
    )
    
    fireEvent.click(screen.getByText('Tab 2'))
    expect(onChange).toHaveBeenCalledWith('t2')
  })
})
