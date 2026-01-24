import { Button, Drawer, DrawerBody, DrawerContent, DrawerHeader, useDisclosure } from "@heroui/react"
import { BookOpen, Menu, PanelRightClose, PanelRightOpen } from "lucide-react"
import { ReactNode, useState } from "react"
import { cn } from "../../lib/utils"

interface ChatLayoutProps {
  sidebar: ReactNode
  children: ReactNode
  sourcesPanel: ReactNode
  showSources?: boolean
}

export function ChatLayout({ sidebar, children, sourcesPanel, showSources = true }: ChatLayoutProps) {
  const [isSourcesOpen, setIsSourcesOpen] = useState(true)
  const { isOpen: isMobileSourcesOpen, onOpen: onMobileSourcesOpen, onOpenChange: onMobileSourcesOpenChange } = useDisclosure()
  const { isOpen: isMobileSidebarOpen, onOpen: onMobileSidebarOpen, onOpenChange: onMobileSidebarOpenChange } = useDisclosure()

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background">
      <div className="hidden md:flex w-64 border-r border-default-100 flex-col bg-background">
        {sidebar}
      </div>

      <div className="md:hidden absolute top-4 left-4 z-20">
        <Button isIconOnly variant="flat" onPress={onMobileSidebarOpen}>
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="flex-1 relative">
          {children}
        </div>
        
        <div className="md:hidden absolute top-4 right-4 z-20">
          <Button isIconOnly variant="flat" onPress={onMobileSourcesOpen}>
            <BookOpen className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {showSources && (
        <div className={cn(
          "hidden md:flex border-l border-default-100 bg-background transition-all duration-300 ease-in-out relative",
          isSourcesOpen ? "w-80" : "w-12"
        )}>
           <div className="absolute top-2 right-2 z-10">
             <Button 
               isIconOnly 
               size="sm" 
               variant="light" 
               onPress={() => setIsSourcesOpen(!isSourcesOpen)}
               className="text-default-400 hover:text-foreground"
             >
               {isSourcesOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
             </Button>
           </div>
           <div className={cn("h-full w-full overflow-hidden", !isSourcesOpen && "opacity-0 invisible")}>
             {sourcesPanel}
           </div>
        </div>
      )}

      <Drawer isOpen={isMobileSidebarOpen} onOpenChange={onMobileSidebarOpenChange} placement="left">
        <DrawerContent>
          {(onClose) => (
            <>
              <DrawerHeader className="px-4 py-2 border-b border-default-100">Sessions</DrawerHeader>
              <DrawerBody className="p-0">
                {sidebar}
              </DrawerBody>
            </>
          )}
        </DrawerContent>
      </Drawer>

      <Drawer isOpen={isMobileSourcesOpen} onOpenChange={onMobileSourcesOpenChange} placement="right">
        <DrawerContent>
          {(onClose) => (
            <>
              <DrawerHeader className="px-4 py-2 border-b border-default-100">Sources</DrawerHeader>
              <DrawerBody className="p-0">
                {sourcesPanel}
              </DrawerBody>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  )
}
