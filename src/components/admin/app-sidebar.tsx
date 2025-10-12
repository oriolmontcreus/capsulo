import * as React from "react"
import { Command, FolderIcon } from "lucide-react"

import { NavUser } from "@/components/admin/nav-user"
import FileTree from "@/components/admin/FileTree"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

interface PageInfo {
  id: string;
  name: string;
  path: string;
}

interface ComponentData {
  id: string;
  schemaName: string;
  data: Record<string, { type: any; value: any }>;
}

interface PageData {
  components: ComponentData[];
}

const CMSFileTreeWrapper: React.FC<{
  availablePages: PageInfo[];
  pagesData: Record<string, PageData>;
  selectedPage?: string;
  onPageSelect?: (pageId: string) => void;
  onComponentSelect?: (pageId: string, componentId: string) => void;
}> = ({ availablePages, pagesData, selectedPage, onPageSelect, onComponentSelect }) => {
  // Convert CMS data to FileTree format
  const items = React.useMemo(() => {
    const treeItems: Record<string, { name: string; children?: string[] }> = {};

    // Root
    treeItems["pages"] = {
      name: "Pages",
      children: availablePages.map(page => page.id),
    };

    // Pages and their components
    availablePages.forEach(page => {
      const pageData = pagesData[page.id] || { components: [] };

      // Use a Set to ensure unique component IDs
      const uniqueComponents = new Map();
      pageData.components.forEach(component => {
        uniqueComponents.set(component.id, component);
      });

      const componentIds = Array.from(uniqueComponents.values()).map(comp => `${page.id}-${comp.id}`);

      treeItems[page.id] = {
        name: page.name,
        children: componentIds.length > 0 ? componentIds : undefined,
      };

      // Components - using unique components
      Array.from(uniqueComponents.values()).forEach(component => {
        const fullId = `${page.id}-${component.id}`;
        treeItems[fullId] = {
          name: component.schemaName || 'Unnamed Component',
        };
      });
    });

    return treeItems;
  }, [availablePages, pagesData]);

  // Determine initial expanded items based on selected page
  const initialExpandedItems = React.useMemo(() => {
    return selectedPage ? [selectedPage] : [];
  }, [selectedPage]);

  // Handle item clicks
  const handleItemClick = (itemId: string) => {
    // Check if it's a component (contains a dash and is not 'pages')
    if (itemId.includes('-') && itemId !== 'pages') {
      const parts = itemId.split('-');
      if (parts.length >= 2) {
        const pageId = parts[0];
        const componentId = parts.slice(1).join('-');

        // Switch to the page if needed
        if (pageId !== selectedPage) {
          onPageSelect?.(pageId);
        }

        // Scroll to component
        setTimeout(() => {
          const componentElement = document.getElementById(`component-${componentId}`);
          if (componentElement) {
            componentElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
            // Add highlight effect
            componentElement.style.transition = 'box-shadow 0.3s ease';
            componentElement.style.boxShadow = '0 0 0 2px hsl(var(--ring))';
            setTimeout(() => {
              componentElement.style.boxShadow = '';
            }, 2000);
          }
        }, 100);

        onComponentSelect?.(pageId, componentId);
      }
    } else if (itemId !== 'pages') {
      // It's a page
      onPageSelect?.(itemId);
    }
  };

  return (
    <FileTree
      items={items}
      rootItemId="pages"
      initialExpandedItems={initialExpandedItems}
      placeholder="Search pages and components..."
      onItemClick={handleItemClick}
    />
  );
};





interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    name?: string
    login?: string
    email?: string
    avatar_url?: string
  }
  onLogout?: () => void
  availablePages?: PageInfo[]
  pagesData?: Record<string, PageData>
  selectedPage?: string
  onPageSelect?: (pageId: string) => void
  onComponentSelect?: (pageId: string, componentId: string) => void
}

export function AppSidebar({
  user,
  onLogout,
  availablePages = [],
  pagesData = {},
  selectedPage,
  onPageSelect,
  onComponentSelect,
  ...props
}: AppSidebarProps) {
  const { setOpen } = useSidebar()

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
      {...props}
    >
      {/* This is the first sidebar */}
      {/* We disable collapsible and adjust width to icon. */}
      {/* This will make the sidebar appear as icons. */}
      <Sidebar
        collapsible="none"
        className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r"
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
                <a href="#">
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <Command className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">Acme Inc</span>
                    <span className="truncate text-xs">Enterprise</span>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={{
                      children: "Pages",
                      hidden: false,
                    }}
                    className="px-2.5 md:px-2"
                  >
                    <FolderIcon className="size-4" />
                    <span>Pages</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <NavUser
            user={{
              name: user?.name || user?.login || 'User',
              email: user?.email || '',
              avatar: user?.avatar_url || ''
            }}
            onLogout={onLogout}
          />
        </SidebarFooter>
      </Sidebar>

      {/* This is the second sidebar with the file tree */}
      {/* We disable collapsible and let it fill remaining space */}
      <Sidebar collapsible="none" className="hidden flex-1 md:flex">
        <SidebarHeader className="gap-3.5 border-b p-4">
          <div className="flex w-full items-center justify-between">
            <div className="text-foreground text-base font-medium">
              Site Structure
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-4">
          <CMSFileTreeWrapper
            availablePages={availablePages}
            pagesData={pagesData}
            selectedPage={selectedPage}
            onPageSelect={onPageSelect}
            onComponentSelect={onComponentSelect}
          />
        </SidebarContent>
      </Sidebar>
    </Sidebar>
  )
}
