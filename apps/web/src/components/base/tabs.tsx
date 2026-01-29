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
      value={selectedKey ? `.$${selectedKey}` : undefined} 
      onValueChange={(val) => onSelectionChange?.(String(val).replace(/^\.\$/, ''))} 
      className={cn("flex flex-col", className)}
    >
      <BaseTabs.List className={cn("inline-flex items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground", sizeClasses[size])}>
        {tabs.map(tab => (
           <BaseTabs.Tab
             key={tab.key}
             value={tab.key as string}
             className={cn(
               "inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow cursor-pointer",
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
