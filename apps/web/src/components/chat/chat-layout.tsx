import { Button, Drawer, DrawerBody, DrawerContent, DrawerHeader, useDisclosure } from "@heroui/react"
import { Menu } from "lucide-react"
import { ReactNode } from "react"

interface ChatLayoutProps {
  sidebar: ReactNode
  children: ReactNode
}

export function ChatLayout({ sidebar, children }: ChatLayoutProps) {
  const { isOpen: isMobileSidebarOpen, onOpen: onMobileSidebarOpen, onOpenChange: onMobileSidebarOpenChange } = useDisclosure()

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <div className="hidden md:flex w-64 border-r border-default-100 flex-col bg-background min-h-0 overflow-hidden">
        {sidebar}
      </div>

      <div className="md:hidden absolute top-4 left-4 z-20">
        <Button isIconOnly variant="flat" onPress={onMobileSidebarOpen}>
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
        <div className="flex-1 relative overflow-hidden">
          {children}
        </div>
      </div>

       <Drawer isOpen={isMobileSidebarOpen} onOpenChange={onMobileSidebarOpenChange} placement="left">
         <DrawerContent>
          {() => (
             <>
               <DrawerHeader className="px-4 py-2 border-b border-default-100">Sessions</DrawerHeader>
               <DrawerBody className="p-0">
                 {sidebar}
               </DrawerBody>
             </>
           )}
         </DrawerContent>
       </Drawer>
    </div>
  )
}
