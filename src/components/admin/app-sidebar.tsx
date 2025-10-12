import * as React from "react"
import { Command, FolderIcon, FolderOpenIcon, FileIcon, FilterIcon, CircleXIcon } from "lucide-react"

import { NavUser } from "@/components/admin/nav-user"
import { Input } from "@/components/ui/input"
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

// CMS FileTree component that adapts the existing FileTree for CMS data
const CMSFileTree: React.FC<{
  availablePages: PageInfo[];
  pagesData: Record<string, PageData>;
  selectedPage?: string;
  onPageSelect?: (pageId: string) => void;
  onComponentSelect?: (pageId: string, componentId: string) => void;
}> = ({ availablePages, pagesData, selectedPage, onPageSelect, onComponentSelect }) => {
  const [state, setState] = React.useState<Partial<any>>({});
  const [searchValue, setSearchValue] = React.useState("");
  const [filteredItems, setFilteredItems] = React.useState<string[]>([]);
  const [expandedPages, setExpandedPages] = React.useState<Set<string>>(
    new Set(selectedPage ? [selectedPage] : [])
  );
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Convert CMS data to FileTree format
  const items = React.useMemo(() => {
    const treeItems: Record<string, { name: string; children?: string[] }> = {};

    // Root
    treeItems["root"] = {
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
          name: component.schemaName || 'Unnamed Component', // Fallback name
        };
      });
    });

    return treeItems;
  }, [availablePages, pagesData]);

  // Auto-expand selected page
  React.useEffect(() => {
    if (selectedPage && !expandedPages.has(selectedPage)) {
      setExpandedPages(prev => new Set([...prev, selectedPage]));
      setState(prev => ({
        ...prev,
        expandedItems: [...(prev.expandedItems || []), selectedPage],
      }));
    }
  }, [selectedPage, expandedPages]);

  // Handle item clicks
  const handleItemClick = (itemId: string) => {
    // Check if it's a component (contains a dash)
    if (itemId.includes('-') && itemId !== 'root') {
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
    } else if (itemId !== 'root') {
      // It's a page
      const newExpanded = new Set(expandedPages);
      if (newExpanded.has(itemId)) {
        newExpanded.delete(itemId);
      } else {
        newExpanded.add(itemId);
      }
      setExpandedPages(newExpanded);

      setState(prev => ({
        ...prev,
        expandedItems: Array.from(newExpanded),
      }));

      onPageSelect?.(itemId);
    }
  };

  // Simplified filtering logic
  const shouldShowItem = (itemId: string) => {
    if (!searchValue || searchValue.length === 0) return true;
    return filteredItems.includes(itemId) ||
      items[itemId]?.name.toLowerCase().includes(searchValue.toLowerCase());
  };

  // Update filtered items when search changes
  React.useEffect(() => {
    if (!searchValue || searchValue.length === 0) {
      setFilteredItems([]);
      return;
    }

    const matches: string[] = [];
    const parentIds = new Set<string>();

    Object.keys(items).forEach(itemId => {
      const item = items[itemId];
      if (item.name.toLowerCase().includes(searchValue.toLowerCase())) {
        matches.push(itemId);

        // Add parents
        if (itemId.includes('-')) {
          const pageId = itemId.split('-')[0];
          parentIds.add(pageId);
          parentIds.add('root');
        } else if (itemId !== 'root') {
          parentIds.add('root');
        }
      }
    });

    setFilteredItems([...matches, ...Array.from(parentIds)]);
  }, [searchValue, items]);

  return (
    <div className="flex h-full flex-col gap-2">
      {/* Search Input */}
      <div className="relative">
        <Input
          ref={inputRef}
          className="peer ps-9"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          type="search"
          placeholder="Filter pages and components..."
        />
        <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
          <FilterIcon className="size-4" aria-hidden="true" />
        </div>
        {searchValue && (
          <button
            className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md text-muted-foreground/80 transition-[color,box-shadow] outline-none hover:text-foreground focus:z-10 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            aria-label="Clear search"
            onClick={() => {
              setSearchValue("");
              setFilteredItems([]);
              inputRef.current?.focus();
            }}
          >
            <CircleXIcon className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Tree Items */}
      <div className="flex-1 space-y-1">
        {searchValue && filteredItems.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-muted-foreground">
            No items found for "{searchValue}"
          </p>
        ) : (
          Object.keys(items).map(itemId => {
            if (itemId === 'root') return null;

            const item = items[itemId];
            const isVisible = shouldShowItem(itemId);
            const isPage = !itemId.includes('-');
            const isExpanded = expandedPages.has(itemId);
            const isSelected = selectedPage === itemId;

            // Only render pages in the main loop, not components
            if (!isPage) return null;

            if (!isVisible && searchValue) return null;

            return (
              <div key={itemId}>
                <div
                  className={`flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${isSelected ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''
                    } ${!isPage ? 'ml-6 py-1' : ''}`}
                  onClick={() => handleItemClick(itemId)}
                >
                  {isPage ? (
                    item.children && item.children.length > 0 ? (
                      isExpanded ? (
                        <FolderOpenIcon className="size-4 text-muted-foreground" />
                      ) : (
                        <FolderIcon className="size-4 text-muted-foreground" />
                      )
                    ) : (
                      <FolderIcon className="size-4 text-muted-foreground" />
                    )
                  ) : (
                    <FileIcon className="size-3 text-muted-foreground" />
                  )}
                  <span className="flex-1 truncate" title={item.name}>{item.name}</span>
                </div>

                {/* Show components when page is expanded */}
                {isPage && isExpanded && item.children && (
                  <>
                    {item.children.map(childId => {
                      const childItem = items[childId];
                      const childVisible = shouldShowItem(childId);

                      if (!childVisible && searchValue) return null;

                      return (
                        <div
                          key={childId}
                          className="flex items-center gap-2 px-2 py-1 text-sm rounded-md cursor-pointer hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground ml-6"
                          onClick={() => handleItemClick(childId)}
                        >
                          <FileIcon className="size-3 text-muted-foreground" />
                          <span className="flex-1 truncate" title={childItem.name}>{childItem.name}</span>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
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
          <CMSFileTree
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
