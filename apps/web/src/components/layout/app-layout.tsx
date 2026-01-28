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
  Navbar,
  NavbarContent,
  NavbarItem
} from "@heroui/react"

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure()

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Desktop Primary Rail */}
      <aside className="hidden md:block w-16 h-full shrink-0 z-20">
        <PrimaryNavRail className="h-full" />
      </aside>

      {/* Desktop Secondary Sidebar */}
      <aside className="hidden md:block h-full shrink-0 z-10">
        <SecondarySidebarSwitcher />
      </aside>

      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <Navbar className="md:hidden border-b" maxWidth="full" isBordered>
          <NavbarContent justify="start">
            <NavbarItem>
              <Button isIconOnly variant="light" onPress={onOpen} aria-label="打开菜单">
                <Menu size={24} />
              </Button>
            </NavbarItem>
            <NavbarItem>
              <span className="font-bold text-lg">Recall Link</span>
            </NavbarItem>
          </NavbarContent>
        </Navbar>

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
