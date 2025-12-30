import * as React from "react"
import { Command, Pencil, Globe, GitCommitIcon, History } from "lucide-react"

import { NavUser } from "@/components/admin/nav-user"
import FileTree from "@/components/admin/FileTree"
import GlobalVariablesSearch from "@/components/admin/GlobalVariablesSearch"
import { PreferencesDialog } from "@/components/admin/PreferencesDialog"
import { ModeToggle } from "@/components/admin/ModeToggle"
import { CommitForm } from "@/components/admin/ChangesViewer/CommitForm"
import { PagesList } from "@/components/admin/ChangesViewer/PagesList"
import { HistoryList } from "@/components/admin/HistoryViewer/HistoryList"
import { useChangesDetection } from "@/components/admin/ChangesViewer/useChangesDetection"
import { useAuthContext } from "@/components/admin/AuthProvider"
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
import capsuloConfig from "@/capsulo.config"
import { getAllSchemas, type GlobalData } from "@/lib/form-builder"

interface PageInfo {
  id: string;
  name: string;
  path: string;
}

interface ComponentData {
  id: string;
  schemaName: string;
  alias?: string;
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
  onComponentSelect?: (pageId: string, componentId: string, shouldScroll?: boolean) => void;
  onComponentReorder?: (pageId: string, newComponentIds: string[]) => void;
}> = ({ availablePages, pagesData, selectedPage, onPageSelect, onComponentSelect, onComponentReorder }) => {
  // Get all available schemas for icons
  const schemas = React.useMemo(() => getAllSchemas(), []);

  // Convert CMS data to FileTree format
  const items = React.useMemo(() => {
    const treeItems: Record<string, { name: string; children?: string[]; icon?: React.ReactNode; iconTheme?: string }> = {};    // Root
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
        const schema = schemas.find(s => s.name === component.schemaName);

        // Use alias if present, otherwise use schema name
        const displayName = component.alias || component.schemaName || 'Unnamed Component';

        treeItems[fullId] = {
          name: displayName,
          icon: schema?.icon,
          iconTheme: schema?.iconTheme,
        };
      });
    });

    return treeItems;
  }, [availablePages, pagesData, schemas]);

  // Determine initial expanded items - expand all folders by default
  const initialExpandedItems = React.useMemo(() => {
    const allFolderIds = Object.keys(items).filter(itemId => {
      const item = items[itemId];
      return item && item.children && item.children.length > 0;
    });
    return allFolderIds;
  }, [items]);  // Handle item clicks
  const handleItemClick = (itemId: string, shouldScroll: boolean = false) => {

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

        // Only scroll if this was triggered from FileTree
        if (shouldScroll) {
          setTimeout(() => {
            const componentElement = document.getElementById(`component-${componentId}`);
            if (componentElement) {
              // Find the ScrollArea viewport (the actual scrollable element)
              const scrollContainer = document.querySelector('[data-slot="scroll-area-viewport"]');

              if (scrollContainer) {
                // Get the component's position relative to the scroll container
                const containerRect = scrollContainer.getBoundingClientRect();
                const elementRect = componentElement.getBoundingClientRect();

                // Calculate the scroll position with offset
                const currentScrollTop = scrollContainer.scrollTop;
                const targetScrollTop = currentScrollTop + (elementRect.top - containerRect.top) - 50; // 50px offset from top

                // Smooth scroll within the container
                scrollContainer.scrollTo({
                  top: targetScrollTop,
                  behavior: 'smooth'
                });
              } else {
                // Fallback to scrollIntoView if container is not found
                componentElement.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start',
                  inline: 'nearest'
                });
              }
            }
          }, 100);
        }


        onComponentSelect?.(pageId, componentId, shouldScroll);
      }
    } else if (itemId !== 'pages') {
      // It's a page

      onPageSelect?.(itemId);
    }
  };

  // Handle reordering of components within a page
  const handleReorder = (parentId: string, newChildren: string[]) => {
    // Check if this is a page (components are being reordered)
    if (parentId !== 'pages' && pagesData[parentId]) {
      // Extract component IDs from the full IDs (format: pageId-componentId)
      const newComponentIds = newChildren.map(fullId => {
        const parts = fullId.split('-');
        return parts.slice(1).join('-'); // Remove the pageId prefix
      });

      onComponentReorder?.(parentId, newComponentIds);
    }
  };

  // Create a stable key that includes the order of components and their aliases
  const treeKey = React.useMemo(() => {
    const orderedData: string[] = [];
    availablePages.forEach(page => {
      const pageData = pagesData[page.id];
      if (pageData?.components) {
        const componentData = pageData.components.map(c => `${c.id}:${c.alias || ''}`).join(',');
        orderedData.push(`${page.id}:${componentData}`);
      }
    });
    return orderedData.join('|');
  }, [availablePages, pagesData]);

  return (
    <FileTree
      key={treeKey}
      items={items}
      rootItemId="pages"
      initialExpandedItems={initialExpandedItems}
      placeholder="Search pages and components..."
      onItemClick={handleItemClick}
      filterRegex={capsuloConfig.ui.pageFilterRegex}
      onReorder={handleReorder}
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
  onComponentSelect?: (pageId: string, componentId: string, shouldScroll?: boolean) => void
  onComponentReorder?: (pageId: string, newComponentIds: string[]) => void
  globalData?: GlobalData
  selectedVariable?: string
  onVariableSelect?: (variableId: string) => void
  activeView?: 'content' | 'globals' | 'changes' | 'history'
  onViewChange?: (view: 'content' | 'globals' | 'changes' | 'history') => void
  commitMessage?: string
  onCommitMessageChange?: (msg: string) => void
  onPublish?: () => void
  globalSearchQuery?: string
  onGlobalSearchChange?: (query: string) => void
  highlightedGlobalField?: string
  onGlobalFieldHighlight?: (fieldKey: string) => void
  globalFormData?: Record<string, any>
  selectedCommit?: string | null
  onCommitSelect?: (sha: string) => void
}

export function AppSidebar({
  user,
  onLogout,
  availablePages = [],
  pagesData = {},
  selectedPage,
  onPageSelect,
  onComponentSelect,
  onComponentReorder,
  globalData = { variables: [] },
  selectedVariable,
  onVariableSelect,
  activeView = 'content',
  onViewChange,
  globalSearchQuery = '',
  onGlobalSearchChange,
  highlightedGlobalField,
  onGlobalFieldHighlight,
  globalFormData,
  commitMessage,
  onCommitMessageChange,
  onPublish,
  selectedCommit,
  onCommitSelect,
  ...props
}: AppSidebarProps) {
  const { setOpen } = useSidebar()
  const { token } = useAuthContext()

  // Use change detection hook to get actual changes (comparing local vs remote)
  const { pagesWithChanges, globalsHasChanges, isLoading: isLoadingChanges, refresh: refreshChanges } = useChangesDetection(
    availablePages,
    token
  )

  // Refresh changes detection when switching to the changes view
  React.useEffect(() => {
    if (activeView === 'changes') {
      refreshChanges();
    }
  }, [activeView, refreshChanges]);

  // Listen for undo events from ChangesManager to refresh the list
  React.useEffect(() => {
    const handleChangesUpdated = () => {
      refreshChanges();
    };

    window.addEventListener('cms-changes-updated', handleChangesUpdated);
    return () => window.removeEventListener('cms-changes-updated', handleChangesUpdated);
  }, [refreshChanges]);

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
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
                      children: "Content",
                      hidden: false,
                    }}
                    className="px-2.5 md:px-2"
                    onClick={(e) => {
                      e.preventDefault();
                      onViewChange?.('content');
                    }}
                    isActive={activeView === 'content'}
                    asChild
                  >
                    <a href="/admin/content" onClick={(e) => e.preventDefault()}>
                      <Pencil className="size-4" />
                      <span>Content</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={{
                      children: "Global Variables",
                      hidden: false,
                    }}
                    className="px-2.5 md:px-2"
                    onClick={(e) => {
                      e.preventDefault();
                      onViewChange?.('globals');
                    }}
                    isActive={activeView === 'globals'}
                    asChild
                  >
                    <a href="/admin/globals" onClick={(e) => e.preventDefault()}>
                      <Globe className="size-4" />
                      <span>Global Variables</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={{
                      children: "Changes",
                      hidden: false,
                    }}
                    className="px-2.5 md:px-2"
                    onClick={(e) => {
                      e.preventDefault();
                      onViewChange?.('changes');
                    }}
                    isActive={activeView === 'changes'}
                    asChild
                  >
                    <a href="/admin/changes" onClick={(e) => e.preventDefault()}>
                      <GitCommitIcon className="size-4" />
                      <span>Changes</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={{
                      children: "History",
                      hidden: false,
                    }}
                    className="px-2.5 md:px-2"
                    onClick={(e) => {
                      e.preventDefault();
                      onViewChange?.('history');
                    }}
                    isActive={activeView === 'history'}
                    asChild
                  >
                    <a href="/admin/history" onClick={(e) => e.preventDefault()}>
                      <History className="size-4" />
                      <span>History</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarGroup className="p-0">
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                <SidebarMenuItem>
                  <ModeToggle />
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <PreferencesDialog />
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
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
      <Sidebar collapsible="none" className="hidden flex-1 md:flex bg-background">
        {activeView === 'content' ? (
          <>
            <SidebarHeader className="gap-3.5 border-b">
              <div className="flex w-full items-center justify-between">
                <div className="text-foreground text-base">
                  CONTENT
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
                onComponentReorder={onComponentReorder}
              />
            </SidebarContent>
          </>
        ) : activeView === 'globals' ? (
          <>
            <SidebarHeader className="gap-3.5 border-b">
              <div className="flex w-full items-center justify-between">
                <div className="text-foreground text-base">
                  GLOBAL VARIABLES
                </div>
              </div>
            </SidebarHeader>
            <SidebarContent className="p-4">
              <GlobalVariablesSearch
                globalData={globalData}
                searchQuery={globalSearchQuery || ''}
                onSearchChange={onGlobalSearchChange || (() => { })}
                onResultClick={onGlobalFieldHighlight}
                highlightedField={highlightedGlobalField}
                formData={globalFormData}
              />
            </SidebarContent>
          </>
        ) : activeView === 'history' ? (
          <>
            <SidebarHeader className="gap-3.5 border-b">
              <div className="flex w-full items-center justify-between">
                <div className="text-foreground text-base">
                  HISTORY
                </div>
              </div>
            </SidebarHeader>
            <SidebarContent className="flex flex-col h-full">
              <HistoryList
                selectedCommit={selectedCommit || null}
                onCommitSelect={(sha) => onCommitSelect?.(sha)}
                className="p-2"
              />
            </SidebarContent>
          </>
        ) : (
          <>
            <SidebarHeader className="gap-3.5 border-b">
              <div className="flex w-full items-center justify-between">
                <div className="text-foreground text-base">
                  CHANGES
                </div>
              </div>
            </SidebarHeader>
            <SidebarContent className="flex flex-col h-full">
              <div className="p-4 border-b">
                <CommitForm
                  commitMessage={commitMessage || ''}
                  onCommitMessageChange={(msg) => onCommitMessageChange?.(msg)}
                  onPublish={() => onPublish?.()}
                  textareaClassName="bg-background"
                />
              </div>
              <PagesList
                pagesWithChanges={pagesWithChanges}
                globalsHasChanges={globalsHasChanges}
                isLoading={isLoadingChanges}
                selectedPage={selectedPage || ''}
                onPageSelect={(pageId) => onPageSelect?.(pageId)}
                className="p-2"
              />
            </SidebarContent>
          </>
        )}
      </Sidebar>
    </Sidebar>
  )
}
