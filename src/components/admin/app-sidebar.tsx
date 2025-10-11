import * as React from "react"
import { Command, FolderIcon, FolderOpenIcon, FileIcon } from "lucide-react"

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



// Custom FileTree component for CMS pages and components
const CustomFileTree: React.FC<{
  availablePages: PageInfo[];
  pagesData: Record<string, PageData>;
  selectedPage?: string;
  onPageSelect?: (pageId: string) => void;
  onComponentSelect?: (pageId: string, componentId: string) => void;
}> = ({ availablePages, pagesData, selectedPage, onPageSelect, onComponentSelect }) => {
  const [expandedPages, setExpandedPages] = React.useState<Set<string>>(new Set());

  const togglePageExpansion = (pageId: string) => {
    const newExpanded = new Set(expandedPages);
    if (newExpanded.has(pageId)) {
      newExpanded.delete(pageId);
    } else {
      newExpanded.add(pageId);
    }
    setExpandedPages(newExpanded);
  };

  const handlePageClick = (pageId: string) => {
    togglePageExpansion(pageId);
    onPageSelect?.(pageId);
  };

  const handleComponentClick = (pageId: string, componentId: string) => {
    onComponentSelect?.(pageId, componentId);
  };

  return (
    <div className="space-y-1">
      {availablePages.map(page => {
        const pageData = pagesData[page.id] || { components: [] };
        const isExpanded = expandedPages.has(page.id);
        const isSelected = selectedPage === page.id;

        return (
          <div key={page.id} className="space-y-1">
            <div
              className={`flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${isSelected ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''
                }`}
              onClick={() => handlePageClick(page.id)}
            >
              {pageData.components.length > 0 ? (
                isExpanded ? (
                  <FolderOpenIcon className="size-4 text-muted-foreground" />
                ) : (
                  <FolderIcon className="size-4 text-muted-foreground" />
                )
              ) : (
                <FolderIcon className="size-4 text-muted-foreground" />
              )}
              <span className="flex-1">{page.name}</span>
              {pageData.components.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({pageData.components.length})
                </span>
              )}
            </div>

            {isExpanded && pageData.components.length > 0 && (
              <div className="ml-6 space-y-1">
                {pageData.components.map(component => (
                  <div
                    key={component.id}
                    className="flex items-center gap-2 px-2 py-1 text-sm rounded-md cursor-pointer hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    onClick={() => handleComponentClick(page.id, component.id)}
                  >
                    <FileIcon className="size-3 text-muted-foreground" />
                    <span className="flex-1 truncate">{component.schemaName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
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
          <CustomFileTree
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
