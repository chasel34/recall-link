import { useState, useCallback } from 'react'

export interface UseDisclosureProps {
  defaultOpen?: boolean
  isOpen?: boolean
  onOpenChange?: (isOpen: boolean) => void
  onClose?: () => void
  onOpen?: () => void
  id?: string
}

export function useDisclosure(props: UseDisclosureProps = {}) {
  const { 
    defaultOpen = false, 
    isOpen: controlledIsOpen, 
    onOpenChange: setControlledIsOpen,
    onClose: onCloseProp,
    onOpen: onOpenProp 
  } = props

  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(defaultOpen)

  const isControlled = controlledIsOpen !== undefined
  const isOpen = isControlled ? controlledIsOpen : uncontrolledIsOpen

  const onOpenChange = useCallback((value: boolean) => {
    if (!isControlled) {
      setUncontrolledIsOpen(value)
    }
    setControlledIsOpen?.(value)
  }, [isControlled, setControlledIsOpen])

  const onOpen = useCallback(() => {
    onOpenChange(true)
    onOpenProp?.()
  }, [onOpenChange, onOpenProp])

  const onClose = useCallback(() => {
    onOpenChange(false)
    onCloseProp?.()
  }, [onOpenChange, onCloseProp])

  const onToggle = useCallback(() => {
    const next = !isOpen
    onOpenChange(next)
  }, [isOpen, onOpenChange])

  return {
    isOpen,
    onOpen,
    onClose,
    onOpenChange,
    onToggle,
    isControlled
  }
}
