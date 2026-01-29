import { Tabs as BaseTabs } from '@base-ui/react/tabs'
import React from 'react'
import { cn } from '@/lib/utils'

export interface TabsProps {
  selectedKey?: string
  onSelectionChange?: (key: string) => void
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
  color?: string
  radius?: string
}

export function Tabs({ selectedKey, onSelectionChange, children, className, size = 'md' }: TabsProps) {
  const tabs = React.Children.toArray(children) as React.ReactElement[]

  const normalizeKey = (key: React.Key | null | undefined) => {
    if (key == null) return ''
    return String(key).replace(/^\.\$/, '')
  }

  const sizeClasses = {
    sm: "h-7",
    md: "h-9",
    lg: "h-11"
  }

  const tabSizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-2 text-base"
  }

  return (
    <BaseTabs.Root 
      value={selectedKey}
      onValueChange={(val) => onSelectionChange?.(String(val))}
      className={cn("flex flex-col", className)}
    >
      <BaseTabs.List
        className={cn(
          "inline-flex items-center justify-center rounded-xl bg-muted/60 p-1 text-muted-foreground ring-1 ring-border/60",
          sizeClasses[size]
        )}
      >
        {tabs.map(tab => (
           <BaseTabs.Tab
             key={tab.key}
             value={normalizeKey(tab.key)}
             className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-primary/15 data-[active]:text-foreground data-[active]:ring-1 data-[active]:ring-primary/25 data-[active]:shadow-sm cursor-pointer",
                tabSizeClasses[size]
              )}
            >
              {tab.props.title}
            </BaseTabs.Tab>
        ))}
      </BaseTabs.List>
    </BaseTabs.Root>
  )
}

export function Tab(_props: { key?: string; title: React.ReactNode; children?: React.ReactNode }) {
  return null
}
