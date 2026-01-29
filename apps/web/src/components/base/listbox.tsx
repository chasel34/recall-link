import { cn } from '@/lib/utils'
import React from 'react'

export interface ListboxProps {
  children: React.ReactNode
  onAction?: (key: string | number) => void
  selectedKeys?: any[]
  className?: string
  classNames?: { list?: string }
  variant?: string
  disallowEmptySelection?: boolean
  selectionMode?: string
  'aria-label'?: string
}

export function Listbox({ children, onAction, selectedKeys, className, classNames, ...props }: ListboxProps) {
    const selected = new Set(selectedKeys || [])
    
    return (
        <ul className={cn("w-full flex flex-col p-1", classNames?.list, className)} {...props}>
            {React.Children.map(children, (child) => {
                if (React.isValidElement(child)) {
                    return React.cloneElement(child, { 
                        onClick: () => child.key && onAction?.(child.key),
                        'data-selected': child.key && selected.has(child.key)
                    } as any)
                }
                return child
            })}
        </ul>
    )
}

export interface ListboxItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  textValue?: string
  className?: string
}

export function ListboxItem({ children, className, onClick, ...props }: ListboxItemProps) {
    return (
        <li className="w-full list-none">
            <button
                type="button"
                className={cn("w-full text-left cursor-pointer", className)}
                onClick={onClick}
                {...props}
            >
                {children}
            </button>
        </li>
    )
}
