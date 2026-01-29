import { type ReactNode } from 'react'
import { AppSidebar } from './app-sidebar'
import { PrimaryNavRail } from './primary-nav-rail'
import { SecondarySidebarSwitcher } from './secondary-sidebar-switcher'
import { Menu } from 'lucide-react'
import { 
  Drawer, 
  DrawerContent, 
  DrawerBody, 
  Button, 
  useDisclosure,
} from "@/components/base"

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure()

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Desktop Primary Rail */}
      <aside className="hidden md:block w-20 h-full shrink-0 z-20">
        <PrimaryNavRail className="h-full" />
      </aside>

      {/* Desktop Secondary Sidebar */}
      <aside className="hidden md:block h-full shrink-0 z-10">
        <SecondarySidebarSwitcher />
      </aside>

      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <nav className="md:hidden border-b border-border/40 flex items-center h-16 px-4 bg-background/70 backdrop-blur-md">
          <div className="flex items-center justify-start gap-2">
            <div>
              <Button isIconOnly variant="light" onPress={onOpen} aria-label="打开菜单">
                <Menu size={24} />
              </Button>
            </div>
            <div>
              <span className="font-serif font-semibold text-lg text-foreground/90">Recall Link</span>
            </div>
          </div>
        </nav>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      <Drawer isOpen={isOpen} onOpenChange={onOpenChange} placement="left" size="xs">
        <DrawerContent>
          {(onClose) => (
            <DrawerBody className="p-0">
              <AppSidebar onItemClick={onClose}>
                <SecondarySidebarSwitcher className="flex-1 flex flex-col min-h-0" />
              </AppSidebar>
            </DrawerBody>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  )
}
