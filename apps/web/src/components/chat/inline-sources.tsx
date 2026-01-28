import { Link } from "@tanstack/react-router"
import { FileText, Globe } from "lucide-react"
import { cn } from "@/lib/utils"
import React from "react"

export interface SourceItemProps extends React.HTMLAttributes<HTMLElement> {
  title?: string
  url?: string
  item_id?: string
}

export function SourceItem({ title, url, item_id, className, ...props }: SourceItemProps) {
  const displayTitle = title || url || "Untitled Source"
  
  const isInternal = !!item_id
  const isExternal = !isInternal && !!url && (url.startsWith("http:") || url.startsWith("https:"))

  const Icon = isInternal ? FileText : Globe

  const content = (
    <>
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-default-100 shrink-0">
        <Icon className="w-3 h-3 text-default-500" />
      </span>
      <span className="truncate text-sm font-medium text-default-700 group-hover:text-primary transition-colors">
        {displayTitle}
      </span>
    </>
  )

  const containerClasses = cn(
    "group flex items-center gap-3 py-2 px-3 rounded-lg border border-transparent hover:border-default-200 hover:bg-default-50 transition-all max-w-full text-left",
    className
  )

  if (isInternal) {
    return (
      <Link 
        to="/items/$id" 
        params={{ id: item_id! }} 
        className={containerClasses}
      >
        {content}
      </Link>
    )
  }

  if (isExternal) {
    return (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className={containerClasses}
        {...props}
      >
        {content}
      </a>
    )
  }

  return (
    <span className={cn(containerClasses, "cursor-default hover:bg-transparent hover:border-transparent")} {...props}>
      {content}
    </span>
  )
}

export function SourcesBlock({ children, className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <span className={cn("block mt-4 pt-3 border-t border-divider/50", className)} {...props}>
      <span className="flex items-center gap-2 mb-2">
        <span className="block text-xs font-semibold text-default-500 uppercase tracking-wider">
          Sources
        </span>
      </span>
      <span className="flex flex-col gap-1">
        {children}
      </span>
    </span>
  )
}
