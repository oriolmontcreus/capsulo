import { Command, GitCommitIcon, Globe, History, Pencil } from "lucide-react";
import * as React from "react";
import capsuloConfig from "@/capsulo.config";
import { useAuthContext } from "@/components/admin/AuthProvider";
import { CommitForm } from "@/components/admin/ChangesViewer/CommitForm";
import { PagesList } from "@/components/admin/ChangesViewer/PagesList";
import { useChangesDetection } from "@/components/admin/ChangesViewer/useChangesDetection";
import FileTree from "@/components/admin/FileTree";
import GlobalVariablesSearch from "@/components/admin/GlobalVariablesSearch";
import { HistoryList } from "@/components/admin/HistoryViewer/HistoryList";
import { ModeToggle } from "@/components/admin/ModeToggle";
import { NavUser } from "@/components/admin/nav-user";
import { PreferencesDialog } from "@/components/admin/PreferencesDialog";
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
} from "@/components/ui/sidebar";
import { type GlobalData, getAllSchemas } from "@/lib/form-builder";
import Logo from "../capsulo/brand/Logo";

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
  onComponentSelect?: (
    pageId: string,
    componentId: string,
    shouldScroll?: boolean
  ) => void;
  onComponentReorder?: (pageId: string, newComponentIds: string[]) => void;
}> = ({
  availablePages,
  pagesData,
  selectedPage,
  onPageSelect,
  onComponentSelect,
  onComponentReorder,
}) => {
    const schemas = React.useMemo(() => getAllSchemas(), []);

    // Force re-render when components are renamed
    const [renameCounter, setRenameCounter] = React.useState(0);

    React.useEffect(() => {
      const handleComponentRenamed = () => {
        setRenameCounter((prev) => prev + 1);
      };

      window.addEventListener("cms-component-renamed", handleComponentRenamed);
      return () => {
        window.removeEventListener(
          "cms-component-renamed",
          handleComponentRenamed
        );
      };
    }, []);

    const items = React.useMemo(() => {
      const treeItems: Record<
        string,
        { name: string; children?: string[]; icon?: React.ReactNode }
      > = {};
      treeItems["pages"] = {
        name: "Pages",
        children: availablePages.map((page) => page.id),
      };

      availablePages.forEach((page) => {
        const pageData = pagesData[page.id] || { components: [] };

        const uniqueComponents = new Map();
        pageData.components.forEach((component) => {
          uniqueComponents.set(component.id, component);
        });

        const componentIds = Array.from(uniqueComponents.values()).map(
          (comp) => `${page.id}-${comp.id}`
        );

        treeItems[page.id] = {
          name: page.name,
          children: componentIds.length > 0 ? componentIds : undefined,
        };

        Array.from(uniqueComponents.values()).forEach((component) => {
          const fullId = `${page.id}-${component.id}`;
          const schema = schemas.find((s) => s.name === component.schemaName);

          const displayName =
            component.alias || component.schemaName || "Unnamed Component";

          treeItems[fullId] = {
            name: displayName,
            icon: schema?.icon,
          };
        });
      });

      return treeItems;
    }, [availablePages, pagesData, schemas, renameCounter]);

    const initialExpandedItems = React.useMemo(() => {
      const allFolderIds = Object.keys(items).filter((itemId) => {
        const item = items[itemId];
        return item && item.children && item.children.length > 0;
      });
      return allFolderIds;
    }, [items]);
    const handleItemClick = (itemId: string, shouldScroll = false) => {
      if (itemId.includes("-") && itemId !== "pages") {
        const parts = itemId.split("-");
        if (parts.length >= 2) {
          const pageId = parts[0];
          const componentId = parts.slice(1).join("-");

          if (pageId !== selectedPage) {
            onPageSelect?.(pageId);
          }

          if (shouldScroll) {
            setTimeout(() => {
              const componentElement = document.getElementById(
                `component-${componentId}`
              );
              if (componentElement) {
                const scrollContainer = document.querySelector(
                  '[data-slot="scroll-area-viewport"]'
                );

                if (scrollContainer) {
                  const containerRect = scrollContainer.getBoundingClientRect();
                  const elementRect = componentElement.getBoundingClientRect();

                  const currentScrollTop = scrollContainer.scrollTop;
                  const targetScrollTop =
                    currentScrollTop + (elementRect.top - containerRect.top) - 50; // 50px offset from top

                  scrollContainer.scrollTo({
                    top: targetScrollTop,
                    behavior: "smooth",
                  });
                } else {
                  componentElement.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                    inline: "nearest",
                  });
                }
              }
            }, 100);
          }

          onComponentSelect?.(pageId, componentId, shouldScroll);
        }
      } else if (itemId !== "pages") {
        onPageSelect?.(itemId);
      }
    };

    const handleReorder = (parentId: string, newChildren: string[]) => {
      if (parentId !== "pages" && pagesData[parentId]) {
        const newComponentIds = newChildren.map((fullId) => {
          const parts = fullId.split("-");
          return parts.slice(1).join("-"); // Remove the pageId prefix
        });

        onComponentReorder?.(parentId, newComponentIds);
      }
    };

    const treeKey = React.useMemo(() => {
      const orderedData: string[] = [];
      availablePages.forEach((page) => {
        const pageData = pagesData[page.id];
        if (pageData?.components) {
          const componentData = pageData.components
            .map((c) => `${c.id}:${c.alias || ""}`)
            .join(",");
          orderedData.push(`${page.id}:${componentData}`);
        }
      });
      return orderedData.join("|");
    }, [availablePages, pagesData]);

    return (
      <FileTree
        filterRegex={capsuloConfig.ui.pageFilterRegex}
        initialExpandedItems={initialExpandedItems}
        items={items}
        key={treeKey}
        onItemClick={handleItemClick}
        onReorder={handleReorder}
        placeholder="Search pages and components..."
        rootItemId="pages"
      />
    );
  };

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    name?: string;
    login?: string;
    email?: string;
    avatar_url?: string;
  };
  onLogout?: () => void;
  availablePages?: PageInfo[];
  pagesData?: Record<string, PageData>;
  selectedPage?: string;
  onPageSelect?: (pageId: string) => void;
  onComponentSelect?: (
    pageId: string,
    componentId: string,
    shouldScroll?: boolean
  ) => void;
  onComponentReorder?: (pageId: string, newComponentIds: string[]) => void;
  globalData?: GlobalData;
  selectedVariable?: string;
  onVariableSelect?: (variableId: string) => void;
  activeView?: "content" | "globals" | "changes" | "history";
  onViewChange?: (view: "content" | "globals" | "changes" | "history") => void;
  commitMessage?: string;
  onCommitMessageChange?: (msg: string) => void;
  onPublish?: () => void;
  globalSearchQuery?: string;
  onGlobalSearchChange?: (query: string) => void;
  highlightedGlobalField?: string;
  onGlobalFieldHighlight?: (fieldKey: string) => void;
  globalFormData?: Record<string, any>;
  selectedCommit?: string | null;
  onCommitSelect?: (sha: string) => void;
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
  activeView = "content",
  onViewChange,
  globalSearchQuery = "",
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
  const { setOpen } = useSidebar();
  const { token } = useAuthContext();

  // Track if user has ever visited the changes view
  // Once visited, we keep the detection active for the badge indicator
  const [hasVisitedChanges, setHasVisitedChanges] = React.useState(
    activeView === "changes"
  );

  React.useEffect(() => {
    if (activeView === "changes" && !hasVisitedChanges) {
      setHasVisitedChanges(true);
    }
  }, [activeView, hasVisitedChanges]);

  // Only run change detection after the user has visited the changes tab
  // This prevents excessive API calls on initial page load
  const {
    pagesWithChanges,
    globalsHasChanges,
    isLoading: isLoadingChanges,
    refresh: refreshChanges,
  } = useChangesDetection(availablePages, token, {
    enabled: hasVisitedChanges,
  });

  const hasChanges = (pagesWithChanges?.length ?? 0) > 0 || globalsHasChanges;

  React.useEffect(() => {
    if (activeView === "changes") {
      refreshChanges();
    }
  }, [activeView, refreshChanges]);

  React.useEffect(() => {
    const handleChangesUpdated = () => {
      refreshChanges();
    };

    window.addEventListener("cms-changes-updated", handleChangesUpdated);
    return () =>
      window.removeEventListener("cms-changes-updated", handleChangesUpdated);
  }, [refreshChanges]);

  return (
    <Sidebar
      className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
      collapsible="icon"
    >
      <Sidebar
        className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r"
        collapsible="none"
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="md:h-8 md:p-0 rounded-sm" size="lg">
                <a href="#">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-sm text-sidebar-primary-foreground">
                    <Logo className="size-6 text-black dark:text-white" />
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
                    asChild
                    className="px-2.5 md:px-2"
                    isActive={activeView === "content"}
                    onClick={(e) => {
                      e.preventDefault();
                      onViewChange?.("content");
                    }}
                    tooltip={{
                      children: "Content",
                      hidden: false,
                    }}
                  >
                    <a
                      href="/admin/content"
                      onClick={(e) => e.preventDefault()}
                    >
                      <Pencil className="size-4" />
                      <span>Content</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    className="px-2.5 md:px-2"
                    isActive={activeView === "globals"}
                    onClick={(e) => {
                      e.preventDefault();
                      onViewChange?.("globals");
                    }}
                    tooltip={{
                      children: "Global Variables",
                      hidden: false,
                    }}
                  >
                    <a
                      href="/admin/globals"
                      onClick={(e) => e.preventDefault()}
                    >
                      <Globe className="size-4" />
                      <span>Global Variables</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    className="px-2.5 md:px-2"
                    isActive={activeView === "changes"}
                    onClick={(e) => {
                      e.preventDefault();
                      onViewChange?.("changes");
                    }}
                    tooltip={{
                      children: "Changes",
                      hidden: false,
                    }}
                  >
                    <a
                      className="relative"
                      href="/admin/changes"
                      onClick={(e) => e.preventDefault()}
                    >
                      <GitCommitIcon className="size-4" />
                      <span>Changes</span>
                      {hasChanges && (
                        <div className="absolute top-1 right-1 size-1.5 rounded-full bg-primary" />
                      )}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    className="px-2.5 md:px-2"
                    isActive={activeView === "history"}
                    onClick={(e) => {
                      e.preventDefault();
                      onViewChange?.("history");
                    }}
                    tooltip={{
                      children: "History",
                      hidden: false,
                    }}
                  >
                    <a
                      href="/admin/history"
                      onClick={(e) => e.preventDefault()}
                    >
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
            onLogout={onLogout}
            user={{
              name: user?.name || user?.login || "User",
              email: user?.email || "",
              avatar: user?.avatar_url || "",
            }}
          />
        </SidebarFooter>
      </Sidebar>

      <Sidebar
        className="hidden flex-1 bg-background md:flex"
        collapsible="none"
      >
        {activeView === "content" ? (
          <>
            <SidebarHeader className="gap-3.5 border-b">
              <div className="flex w-full items-center justify-between">
                <div className="text-base text-foreground">CONTENT</div>
              </div>
            </SidebarHeader>
            <SidebarContent className="bg-sidebar p-4">
              <CMSFileTreeWrapper
                availablePages={availablePages}
                onComponentReorder={onComponentReorder}
                onComponentSelect={onComponentSelect}
                onPageSelect={onPageSelect}
                pagesData={pagesData}
                selectedPage={selectedPage}
              />
            </SidebarContent>
          </>
        ) : activeView === "globals" ? (
          <>
            <SidebarHeader className="gap-3.5 border-b">
              <div className="flex w-full items-center justify-between">
                <div className="text-base text-foreground">
                  GLOBAL VARIABLES
                </div>
              </div>
            </SidebarHeader>
            <SidebarContent className="bg-sidebar p-4">
              <GlobalVariablesSearch
                formData={globalFormData}
                globalData={globalData}
                highlightedField={highlightedGlobalField}
                onResultClick={onGlobalFieldHighlight}
                onSearchChange={onGlobalSearchChange || (() => { })}
                searchQuery={globalSearchQuery || ""}
              />
            </SidebarContent>
          </>
        ) : activeView === "history" ? (
          <>
            <SidebarHeader className="gap-3.5 border-b">
              <div className="flex w-full items-center justify-between">
                <div className="text-base text-foreground">HISTORY</div>
              </div>
            </SidebarHeader>
            <SidebarContent className="flex h-full flex-col bg-sidebar">
              <HistoryList
                onCommitSelect={(sha) => onCommitSelect?.(sha)}
                selectedCommit={selectedCommit || null}
              />
            </SidebarContent>
          </>
        ) : (
          <>
            <SidebarHeader className="gap-3.5 border-b">
              <div className="flex w-full items-center justify-between">
                <div className="text-base text-foreground">CHANGES</div>
              </div>
            </SidebarHeader>
            <SidebarContent className="flex h-full flex-col bg-sidebar">
              <div className="border-b p-4">
                <CommitForm
                  commitMessage={commitMessage || ""}
                  globalsHasChanges={globalsHasChanges}
                  onCommitMessageChange={(msg) => onCommitMessageChange?.(msg)}
                  onPublish={() => onPublish?.()}
                  pagesWithChanges={pagesWithChanges}
                  token={token}
                />
              </div>
              <PagesList
                className="p-2"
                globalsHasChanges={globalsHasChanges}
                isLoading={isLoadingChanges}
                onPageSelect={(pageId) => onPageSelect?.(pageId)}
                pagesWithChanges={pagesWithChanges}
                selectedPage={selectedPage || ""}
              />
            </SidebarContent>
          </>
        )}
      </Sidebar>
    </Sidebar>
  );
}
