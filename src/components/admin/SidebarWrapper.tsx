import * as React from "react";
import { useNavigate } from "react-router-dom";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { useAuthContext } from "@/components/admin/AuthProvider";
import { AppSidebar } from "@/components/admin/app-sidebar";
import RightSidebar from "@/components/admin/RightSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { usePreferences } from "@/hooks/use-preferences";
import {
  useCacheValidation,
  useGlobalData,
  usePageData,
  usePages,
  useRefreshCache,
} from "@/lib/api/hooks";
import {
  clearAllDrafts,
  getChangedPageIds,
  getGlobalsDraft,
  getPageDraft,
  hasGlobalsDraft,
} from "@/lib/cms-local-changes";
import { batchSaveChanges } from "@/lib/cms-storage-adapter";
import { useTranslation } from "@/lib/form-builder/context/TranslationContext";
import { useTranslationData } from "@/lib/form-builder/context/TranslationDataContext";
import { useValidation } from "@/lib/form-builder/context/ValidationContext";
import {
  useAdminNavigation,
  useAdminUI,
  useCommitFlow,
  useGlobalSearch,
} from "@/lib/stores";
import { validateAllDrafts } from "@/lib/validation/validateAllDrafts";
import { ScrollArea } from "../ui/scroll-area";

interface SidebarWrapperProps {
  children?: React.ReactNode;
  activeView: "content" | "globals" | "changes" | "history";
}

function SidebarWrapperComponent({
  children,
  activeView,
}: SidebarWrapperProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthContext();
  const { preferences, isLoaded } = usePreferences();

  const { data: pages = [] } = usePages();
  const { data: globalData = { variables: [] } } = useGlobalData();

  const { selectedPage, selectedCommit, setSelectedPage, setSelectedCommit } =
    useAdminNavigation();
  const {
    rightSidebarVisible,
    rightSidebarWidth,
    isResizing,
    toggleRightSidebar,
    setRightSidebarWidth,
    setIsResizing,
    setRightSidebarVisible,
  } = useAdminUI();
  const { commitMessage, setCommitMessage, isAutoSaving } = useCommitFlow();
  const { searchQuery, highlightedField, setSearchQuery, highlightField } =
    useGlobalSearch();

  const queryPageId = selectedPage !== "globals" ? selectedPage : undefined;
  const { data: currentPageData } = usePageData(queryPageId);

  useCacheValidation();

  const refreshCache = useRefreshCache();

  const [localPagesData, setLocalPagesData] = React.useState<
    Record<string, { components: any[] }>
  >({});

  // Load local drafts when selectedPage or currentPageData changes
  React.useEffect(() => {
    const loadLocalDrafts = async () => {
      if (!selectedPage) return;

      try {
        // Check for local draft first
        const localDraft = await getPageDraft(selectedPage);
        if (localDraft) {
          setLocalPagesData((prev) => ({
            ...prev,
            [selectedPage]: localDraft,
          }));
          return;
        }

        // Fall back to server data if no local draft
        if (currentPageData) {
          setLocalPagesData((prev) => ({
            ...prev,
            [selectedPage]: currentPageData,
          }));
        }
      } catch (error) {
        console.warn("Failed to load local draft:", error);
        // Fall back to server data
        if (currentPageData) {
          setLocalPagesData((prev) => ({
            ...prev,
            [selectedPage]: currentPageData,
          }));
        }
      }
    };

    loadLocalDrafts();
  }, [selectedPage, currentPageData]);

  // Update localPagesData when currentPageData changes (server data updated)
  React.useEffect(() => {
    if (selectedPage && currentPageData) {
      // Only update if we don't have a local draft
      getPageDraft(selectedPage)
        .then((localDraft) => {
          if (!localDraft) {
            setLocalPagesData((prev) => ({
              ...prev,
              [selectedPage]: currentPageData,
            }));
          }
        })
        .catch(() => {
          // If we can't check for local draft, assume we should use server data
          setLocalPagesData((prev) => ({
            ...prev,
            [selectedPage]: currentPageData,
          }));
        });
    }
  }, [selectedPage, currentPageData]);

  const localPagesDataRef = React.useRef(localPagesData);
  localPagesDataRef.current = localPagesData;

  // Listen for component rename events to update local state
  React.useEffect(() => {
    const handleComponentRenamed = (event: CustomEvent) => {
      const { componentId, alias, pageId } = event.detail as {
        componentId: string;
        alias: string | undefined;
        pageId: string;
      };

      if (localPagesDataRef.current[pageId]) {
        const updatedComponents = localPagesDataRef.current[
          pageId
        ].components.map((comp) =>
          comp.id === componentId ? { ...comp, alias } : comp
        );

        setLocalPagesData((prev) => ({
          ...prev,
          [pageId]: { components: updatedComponents },
        }));
      }
    };

    window.addEventListener(
      "cms-component-renamed",
      handleComponentRenamed as EventListener
    );
    return () => {
      window.removeEventListener(
        "cms-component-renamed",
        handleComponentRenamed as EventListener
      );
    };
  }, []);

  const pagesData = localPagesData;

  const { currentComponent, getFieldValue, setTranslationValue } =
    useTranslationData();

  const { setActiveField } = useTranslation();

  React.useEffect(() => {
    setActiveField(null);
  }, [selectedPage, activeView, setActiveField]);

  const [maxWidth, setMaxWidth] = React.useState(preferences.contentMaxWidth);
  React.useEffect(() => {
    setMaxWidth(preferences.contentMaxWidth);
  }, [preferences.contentMaxWidth]);

  React.useEffect(() => {
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mouseup", handleMouseUp);
    }
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [isResizing, setIsResizing]);

  const handleViewChange = React.useCallback(
    (view: "content" | "globals" | "changes" | "history") => {
      navigate(`/${view}`);
    },
    [navigate]
  );

  const handlePageSelect = React.useCallback(
    (pageId: string) => {
      setSelectedPage(pageId);
      if (activeView === "content") {
        navigate(`/content/${pageId}`);
      }
    },
    [navigate, activeView, setSelectedPage]
  );

  const handleComponentSelect = React.useCallback(
    (pageId: string, componentId: string, shouldScroll?: boolean) => {
      if (selectedPage !== pageId) {
        setSelectedPage(pageId);
        navigate(`/content/${pageId}`);
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
                currentScrollTop + (elementRect.top - containerRect.top) - 50;
              scrollContainer.scrollTo({
                top: targetScrollTop,
                behavior: "smooth",
              });
            }
          }
        }, 100);
      }
    },
    [navigate, selectedPage, setSelectedPage]
  );

  const { setValidationErrors, setShouldAutoRevalidate } = useValidation();

  const handlePublish = React.useCallback(async () => {
    const validationResult = await validateAllDrafts();

    if (!validationResult.isValid) {
      setValidationErrors(validationResult.errors, validationResult.errorList);
      setRightSidebarVisible(true);
      setShouldAutoRevalidate(true); // Enable auto-revalidation on error
      return;
    }

    setShouldAutoRevalidate(false);
    setValidationErrors({}); // Clear specific errors

    try {
      const changedPageIds = await getChangedPageIds();
      const pages: Array<{ pageName: string; data: any }> = [];

      for (const pageId of changedPageIds) {
        const draft = await getPageDraft(pageId);
        if (draft) {
          pages.push({ pageName: pageId, data: draft });
        }
      }

      const hasGlobals = await hasGlobalsDraft();
      const globals = hasGlobals
        ? (await getGlobalsDraft()) || undefined
        : undefined;

      await batchSaveChanges({ pages, globals }, commitMessage);

      await clearAllDrafts();
      setCommitMessage("");

      await refreshCache();

      window.dispatchEvent(new CustomEvent("cms-changes-updated"));
    } catch (error) {
      console.error("Publish failed:", error);
      // Ideally show a toast notification here
    }
  }, [
    commitMessage,
    setValidationErrors,
    setRightSidebarVisible,
    setShouldAutoRevalidate,
    setCommitMessage,
    refreshCache,
  ]);

  return (
    <div className="flex h-screen">
      <SidebarProvider
        style={{ "--sidebar-width": "350px" } as React.CSSProperties}
      >
        <AppSidebar
          activeView={activeView}
          availablePages={pages}
          commitMessage={commitMessage}
          globalData={globalData}
          globalSearchQuery={searchQuery}
          highlightedGlobalField={highlightedField}
          onCommitMessageChange={setCommitMessage}
          onCommitSelect={setSelectedCommit}
          onComponentSelect={handleComponentSelect}
          onGlobalFieldHighlight={highlightField}
          onGlobalSearchChange={setSearchQuery}
          onLogout={logout}
          onPageSelect={handlePageSelect}
          onPublish={handlePublish}
          onViewChange={handleViewChange}
          pagesData={pagesData}
          selectedCommit={selectedCommit}
          selectedPage={selectedPage}
          user={user || undefined}
        />

        <SidebarInset
          className={`flex flex-col ${isResizing ? "" : "transition-all duration-300"}`}
          style={{
            marginRight: rightSidebarVisible ? `${rightSidebarWidth}px` : "0",
          }}
        >
          <AdminHeader
            activeView={activeView}
            availablePages={pages}
            isAutoSaving={isAutoSaving}
            isRightSidebarOpen={rightSidebarVisible}
            onToggleRightSidebar={toggleRightSidebar}
            selectedPage={selectedPage}
          />
          <ScrollArea
            className={`scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border hover:scrollbar-thumb-border/80 flex-1 overflow-hidden bg-background dark:bg-card ${activeView === "history" ? "" : "p-4"}`}
            data-main-scroll-container="true"
          >
            <div
              className={`mx-auto transition-all duration-200 ${activeView === "history" ? "h-full" : ""}`}
              key={maxWidth}
              style={{
                maxWidth:
                  activeView === "history"
                    ? "100%"
                    : isLoaded
                      ? maxWidth
                      : "1400px",
              }}
            >
              {children}
            </div>
          </ScrollArea>
        </SidebarInset>
      </SidebarProvider>

      <RightSidebar
        currentComponentData={currentComponent || undefined}
        getFieldValue={getFieldValue}
        isResizing={isResizing}
        isVisible={rightSidebarVisible}
        onClose={() => setRightSidebarVisible(false)}
        onFieldValueChange={setTranslationValue}
        onNavigateToPage={handlePageSelect}
        onResizeStart={() => setIsResizing(true)}
        onViewChange={handleViewChange}
        onWidthChange={setRightSidebarWidth}
        width={rightSidebarWidth}
      />
    </div>
  );
}

const SidebarWrapper = React.memo(SidebarWrapperComponent);
export default SidebarWrapper;
