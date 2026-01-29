import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { Drawer, DrawerContent, DrawerBody } from './drawer'
import { useDisclosure } from './use-disclosure'

describe('useDisclosure', () => {
  afterEach(() => {
    cleanup()
  })

  it('should handle open/close state', () => {
    let result: any
    
    function TestComponent() {
      result = useDisclosure()
      return null
    }
    
    render(<TestComponent />)
    
    expect(result.isOpen).toBe(false)
  })
})

function TestDrawer() {
  const { isOpen, onOpen, onOpenChange } = useDisclosure()
  
  return (
    <div>
      <button onClick={onOpen}>Open Drawer</button>
      <Drawer isOpen={isOpen} onOpenChange={onOpenChange}>
        <DrawerContent>
          {(onClose) => (
            <DrawerBody>
              <div>Drawer Content</div>
              <button onClick={onClose}>Close Drawer</button>
            </DrawerBody>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  )
}

describe('Drawer', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('should render closed by default', () => {
    render(<TestDrawer />)
    expect(screen.queryByText('Drawer Content')).not.toBeInTheDocument()
  })

  it('should open when triggered', async () => {
    render(<TestDrawer />)
    
    fireEvent.click(screen.getByText('Open Drawer'))
    
    expect(screen.getByText('Drawer Content')).toBeInTheDocument()
  })

  it('should close when close button clicked', async () => {
    render(<TestDrawer />)
    
    fireEvent.click(screen.getByText('Open Drawer'))
    expect(screen.getByText('Drawer Content')).toBeInTheDocument()
    
    fireEvent.click(screen.getByText('Close Drawer'))
    
    await waitFor(() => {
      expect(screen.queryByText('Drawer Content')).not.toBeInTheDocument()
    })
  })

  it('should close on escape key', async () => {
    render(<TestDrawer />)
    
    fireEvent.click(screen.getByText('Open Drawer'))
    expect(screen.getByText('Drawer Content')).toBeInTheDocument()
    
    fireEvent.keyDown(document.body, { key: 'Escape' })
    
    await waitFor(() => {
      expect(screen.queryByText('Drawer Content')).not.toBeInTheDocument()
    })
  })

  it('should render children directly without render prop', () => {
    render(
      <Drawer isOpen={true} onOpenChange={() => {}}>
        <DrawerContent>
          <DrawerBody>
            <div>Direct Content</div>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    )
    
    expect(screen.getByText('Direct Content')).toBeInTheDocument()
  })
})

describe('useDisclosure hook standalone', () => {
  afterEach(() => {
    cleanup()
  })

  it('should provide controlled state', () => {
    const onOpenChange = vi.fn()
    
    function ControlledComponent() {
      const { isOpen, onOpen, onClose } = useDisclosure({
        isOpen: true,
        onOpenChange
      })
      
      return (
        <div>
          <div data-testid="state">{String(isOpen)}</div>
          <button onClick={onOpen}>Open</button>
          <button onClick={onClose}>Close</button>
        </div>
      )
    }
    
    render(<ControlledComponent />)
    
    expect(screen.getByTestId('state')).toHaveTextContent('true')
    
    fireEvent.click(screen.getByText('Close'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    
    expect(screen.getByTestId('state')).toHaveTextContent('true')
  })
})
