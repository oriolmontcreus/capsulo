/**
 * SidebarWrapper - Layout wrapper with App Sidebar and Right Sidebar
 * 
 * Phase 6: Simplified to consume Zustand stores directly instead of 20+ props.
 * Only receives `activeView` and `children` as props since these come from the router.
 */

import * as React from "react";
import { useNavigate } from "react-router-dom";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { useAuthContext } from "@/components/admin/AuthProvider";
import RightSidebar from "@/components/admin/RightSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { usePreferences } from "@/hooks/use-preferences";
import { useTranslationData } from "@/lib/form-builder/context/TranslationDataContext";
import { usePages, usePageData, useGlobalData, useCacheValidation, useRefreshCache } from "@/lib/api/hooks";
import { useAdminNavigation, useAdminUI, useCommitFlow, useGlobalSearch } from "@/lib/stores";
import { useValidation } from "@/lib/form-builder/context/ValidationContext";
import { validateAllDrafts } from "@/lib/validation/validateAllDrafts";
import { savePage, saveGlobals } from "@/lib/cms-storage-adapter";
import {
    clearAllDrafts,
    getChangedPageIds,
    getPageDraft,
    getGlobalsDraft,
    hasGlobalsDraft
} from "@/lib/cms-local-changes";
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar";
import { ScrollArea } from "../ui/scroll-area";

interface SidebarWrapperProps {
    children?: React.ReactNode;
    activeView: 'content' | 'globals' | 'changes' | 'history';
}

function SidebarWrapperComponent({ children, activeView }: SidebarWrapperProps) {
    const navigate = useNavigate();
    const { user, logout } = useAuthContext();
    const { preferences, isLoaded } = usePreferences();

    // Fetch data via TanStack Query
    const { data: pages = [] } = usePages();
    const { data: globalData = { variables: [] } } = useGlobalData();

    // Zustand stores - consume state directly
    const { selectedPage, selectedCommit, setSelectedPage, setSelectedCommit } = useAdminNavigation();
    const { rightSidebarVisible, rightSidebarWidth, isResizing, toggleRightSidebar, setRightSidebarWidth, setIsResizing, setRightSidebarVisible } = useAdminUI();
    const { commitMessage, setCommitMessage, isAutoSaving } = useCommitFlow();
    const { searchQuery, highlightedField, setSearchQuery, highlightField } = useGlobalSearch();

    // Fetch page data for the selected page
    const { data: currentPageData } = usePageData(selectedPage);

    // Cache validation - runs on mount to check if remote data has changed
    useCacheValidation();

    // Cache refresh function - used after publish
    const refreshCache = useRefreshCache();

    // Build pagesData record for AppSidebar
    const pagesData = React.useMemo(() => {
        const data: Record<string, { components: any[] }> = {};
        if (selectedPage && currentPageData) {
            data[selectedPage] = currentPageData;
        }
        return data;
    }, [selectedPage, currentPageData]);

    // Translation context for RightSidebar
    const {
        currentComponent,
        getFieldValue,
        setTranslationValue
    } = useTranslationData();

    // Preferences for content max width
    const [maxWidth, setMaxWidth] = React.useState(preferences.contentMaxWidth);
    React.useEffect(() => {
        setMaxWidth(preferences.contentMaxWidth);
    }, [preferences.contentMaxWidth]);

    // Handle resize end
    React.useEffect(() => {
        const handleMouseUp = () => setIsResizing(false);
        if (isResizing) {
            document.addEventListener('mouseup', handleMouseUp);
        }
        return () => document.removeEventListener('mouseup', handleMouseUp);
    }, [isResizing, setIsResizing]);

    // Navigation handlers
    const handleViewChange = React.useCallback((view: 'content' | 'globals' | 'changes' | 'history') => {
        navigate(`/${view}`);
    }, [navigate]);

    const handlePageSelect = React.useCallback((pageId: string) => {
        setSelectedPage(pageId);
        if (activeView === 'content') {
            navigate(`/content/${pageId}`);
        }
    }, [navigate, activeView, setSelectedPage]);

    const handleComponentSelect = React.useCallback((pageId: string, componentId: string, shouldScroll?: boolean) => {
        if (selectedPage !== pageId) {
            setSelectedPage(pageId);
            navigate(`/content/${pageId}`);
        }

        if (shouldScroll) {
            setTimeout(() => {
                const componentElement = document.getElementById(`component-${componentId}`);
                if (componentElement) {
                    const scrollContainer = document.querySelector('[data-slot="scroll-area-viewport"]');
                    if (scrollContainer) {
                        const containerRect = scrollContainer.getBoundingClientRect();
                        const elementRect = componentElement.getBoundingClientRect();
                        const currentScrollTop = scrollContainer.scrollTop;
                        const targetScrollTop = currentScrollTop + (elementRect.top - containerRect.top) - 50;
                        scrollContainer.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
                    }
                }
            }, 100);
        }
    }, [navigate, selectedPage, setSelectedPage]);

    const { setValidationErrors, setShouldAutoRevalidate } = useValidation();

    const handlePublish = React.useCallback(async () => {
        // Validate all drafts before allowing publish
        const validationResult = validateAllDrafts();

        if (!validationResult.isValid) {
            setValidationErrors(validationResult.errors, validationResult.errorList);
            setRightSidebarVisible(true);
            setShouldAutoRevalidate(true); // Enable auto-revalidation on error
            return;
        }

        // Validation passed, disable auto-revalidation
        setShouldAutoRevalidate(false);
        setValidationErrors({}); // Clear specific errors

        try {
            // Save all changed pages
            const changedPageIds = getChangedPageIds();
            for (const pageId of changedPageIds) {
                const draft = getPageDraft(pageId);
                if (draft) {
                    await savePage(pageId, draft, commitMessage);
                }
            }

            // Save globals if changed
            if (hasGlobalsDraft()) {
                const globalsDraft = getGlobalsDraft();
                if (globalsDraft) {
                    await saveGlobals(globalsDraft, commitMessage);
                }
            }

            clearAllDrafts();
            setCommitMessage("");

            // Refresh cache after successful publish to get fresh data
            await refreshCache();

            window.dispatchEvent(new CustomEvent('cms-changes-updated'));
        } catch (error) {
            console.error("Publish failed:", error);
            // Ideally show a toast notification here
        }

    }, [commitMessage, setValidationErrors, setRightSidebarVisible, setShouldAutoRevalidate, setCommitMessage, refreshCache]);

    return (
        <div className="flex h-screen">
            {/* Left Sidebar */}
            <SidebarProvider
                style={{ "--sidebar-width": "350px" } as React.CSSProperties}
            >
                <AppSidebar
                    user={user || undefined}
                    onLogout={logout}
                    availablePages={pages}
                    pagesData={pagesData}
                    globalData={globalData}
                    selectedPage={selectedPage}
                    activeView={activeView}
                    commitMessage={commitMessage}
                    onCommitMessageChange={setCommitMessage}
                    onPublish={handlePublish}
                    globalSearchQuery={searchQuery}
                    onGlobalSearchChange={setSearchQuery}
                    highlightedGlobalField={highlightedField}
                    onGlobalFieldHighlight={highlightField}
                    onPageSelect={handlePageSelect}
                    onComponentSelect={handleComponentSelect}
                    onViewChange={handleViewChange}
                    selectedCommit={selectedCommit}
                    onCommitSelect={setSelectedCommit}
                />

                {/* Main Content Area */}
                <SidebarInset
                    className={`flex flex-col ${!isResizing ? 'transition-all duration-300' : ''}`}
                    style={{ marginRight: rightSidebarVisible ? `${rightSidebarWidth}px` : '0' }}
                >
                    <AdminHeader
                        activeView={activeView}
                        selectedPage={selectedPage}
                        availablePages={pages}
                        isAutoSaving={isAutoSaving}
                        isRightSidebarOpen={rightSidebarVisible}
                        onToggleRightSidebar={toggleRightSidebar}
                    />
                    <ScrollArea
                        className={`flex-1 overflow-hidden scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border hover:scrollbar-thumb-border/80 bg-card ${activeView === 'history' ? '' : 'p-4'}`}
                        data-main-scroll-container="true"
                    >
                        <div
                            key={maxWidth}
                            className={`mx-auto transition-all duration-200 ${activeView === 'history' ? 'h-full' : ''}`}
                            style={{ maxWidth: activeView === 'history' ? '100%' : (isLoaded ? maxWidth : '1400px') }}
                        >
                            {children}
                        </div>
                    </ScrollArea>
                </SidebarInset>
            </SidebarProvider>

            {/* Right Sidebar (Translation & Validation) */}
            <RightSidebar
                width={rightSidebarWidth}
                onWidthChange={setRightSidebarWidth}
                isResizing={isResizing}
                onResizeStart={() => setIsResizing(true)}
                currentComponentData={currentComponent || undefined}
                onFieldValueChange={setTranslationValue}
                getFieldValue={getFieldValue}
                isVisible={rightSidebarVisible}
                onClose={() => setRightSidebarVisible(false)}
                onNavigateToPage={handlePageSelect}
                onViewChange={handleViewChange}
            />
        </div>
    );
}

const SidebarWrapper = React.memo(SidebarWrapperComponent);
export default SidebarWrapper;