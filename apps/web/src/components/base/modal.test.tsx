import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from './modal'

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('Modal', () => {
  const onOpenChange = vi.fn()

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('does not render when open is false', () => {
    render(
      <Modal isOpen={false} onOpenChange={onOpenChange}>
        <ModalContent>
          <ModalBody>Content</ModalBody>
        </ModalContent>
      </Modal>
    )
    expect(screen.queryByText('Content')).not.toBeInTheDocument()
  })

  it('renders when open is true', () => {
    render(
      <Modal isOpen={true} onOpenChange={onOpenChange}>
        <ModalContent>
          <ModalBody>Content</ModalBody>
        </ModalContent>
      </Modal>
    )
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('calls onOpenChange(false) when pressing Escape', () => {
    render(
      <Modal isOpen={true} onOpenChange={onOpenChange}>
        <ModalContent>
          <ModalBody>Content</ModalBody>
        </ModalContent>
      </Modal>
    )
    
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('supports render prop for ModalContent', () => {
    const handleClose = vi.fn()
    
    render(
      <Modal isOpen={true} onOpenChange={handleClose}>
        <ModalContent>
          {(onClose: () => void) => (
             <div>
               <button onClick={onClose}>Close Button</button>
             </div>
          )}
        </ModalContent>
      </Modal>
    )

    fireEvent.click(screen.getByText('Close Button'))
    expect(handleClose).toHaveBeenCalledWith(false)
  })

  it('renders Header, Body, Footer correctly', () => {
    render(
      <Modal isOpen={true} onOpenChange={onOpenChange}>
        <ModalContent>
          <ModalHeader>Header</ModalHeader>
          <ModalBody>Body</ModalBody>
          <ModalFooter>Footer</ModalFooter>
        </ModalContent>
      </Modal>
    )
    
    expect(screen.getByText('Header')).toBeInTheDocument()
    expect(screen.getByText('Body')).toBeInTheDocument()
    expect(screen.getByText('Footer')).toBeInTheDocument()
  })
})
