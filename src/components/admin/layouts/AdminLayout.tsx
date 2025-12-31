import React, { useState, useCallback, useMemo, createContext, useContext } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthContext } from '@/components/admin/AuthProvider';
import SidebarWrapper from '@/components/admin/SidebarWrapper';
import { usePages, usePageData, useGlobalData } from '@/lib/api/hooks';
import { Spinner } from '@/components/ui/spinner';
import type { PageData, GlobalData } from '@/lib/form-builder';

// Create a stable QueryClient instance
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes default
            retry: 1,
        },
    },
});

/**
 * Context to share layout state with child pages
 */
interface AdminLayoutContextValue {
    selectedCommit: string | null;
    setSelectedCommit: (sha: string | null) => void;
    selectedPage: string;
    setSelectedPage: (pageId: string) => void;
    globalSearchQuery: string;
    setGlobalSearchQuery: (query: string) => void;
    highlightedGlobalField: string | undefined;
    setHighlightedGlobalField: (field: string | undefined) => void;
}

const AdminLayoutContext = createContext<AdminLayoutContextValue | null>(null);

export function useAdminLayoutContext() {
    const ctx = useContext(AdminLayoutContext);
    if (!ctx) throw new Error('useAdminLayoutContext must be used within AdminLayout');
    return ctx;
}

/**
 * Deriving the active view from the current route path
 */
function useActiveView(): 'content' | 'globals' | 'changes' | 'history' {
    const location = useLocation();
    const path = location.pathname;

    if (path.includes('/globals')) return 'globals';
    if (path.includes('/changes')) return 'changes';
    if (path.includes('/history')) return 'history';
    return 'content';
}

/**
 * Inner layout component that uses router hooks
 */
function AdminLayoutInner() {
    const navigate = useNavigate();
    const location = useLocation();
    const { pageId } = useParams<{ pageId?: string }>();
    const activeView = useActiveView();

    // Fetch data via TanStack Query
    const { data: pages = [], isLoading: isLoadingPages } = usePages();
    const { data: globalData = { variables: [] } } = useGlobalData();

    // Derive selected page from URL params or default to first page
    const [selectedPageState, setSelectedPageState] = useState('');
    const selectedPage = pageId || selectedPageState || pages[0]?.id || '';

    // Sync selected page when pages load
    React.useEffect(() => {
        if (pages.length > 0 && !selectedPageState && !pageId) {
            setSelectedPageState(pages[0].id);
        }
    }, [pages, selectedPageState, pageId]);

    // Fetch page data for the selected page
    const { data: currentPageData } = usePageData(selectedPage);

    // Build pagesData record for SidebarWrapper
    const pagesData = useMemo(() => {
        const data: Record<string, PageData> = {};
        if (selectedPage && currentPageData) {
            data[selectedPage] = currentPageData;
        }
        return data;
    }, [selectedPage, currentPageData]);

    // State for UI elements
    const [commitMessage, setCommitMessage] = useState('');
    const [selectedCommit, setSelectedCommit] = useState<string | null>(null);
    const [globalSearchQuery, setGlobalSearchQuery] = useState('');
    const [highlightedGlobalField, setHighlightedGlobalField] = useState<string | undefined>();
    const [globalFormData, setGlobalFormData] = useState<Record<string, any>>({});
    const [isAutoSaving, setIsAutoSaving] = useState(false);

    // Navigation handlers that integrate with React Router
    const handleViewChange = useCallback((view: 'content' | 'globals' | 'changes' | 'history') => {
        switch (view) {
            case 'content':
                navigate('/content');
                break;
            case 'globals':
                navigate('/globals');
                break;
            case 'changes':
                navigate('/changes');
                break;
            case 'history':
                navigate('/history');
                break;
        }
    }, [navigate]);

    const handlePageSelect = useCallback((pageId: string) => {
        setSelectedPageState(pageId);
        // Navigate to the page editor if on content view
        if (activeView === 'content') {
            navigate(`/content/${pageId}`);
        }
    }, [navigate, activeView]);

    const handleComponentSelect = useCallback((pageId: string, componentId: string, shouldScroll?: boolean) => {
        // Navigate to the page if needed, then scroll to component
        if (selectedPage !== pageId) {
            setSelectedPageState(pageId);
            navigate(`/content/${pageId}`);
        }

        if (shouldScroll) {
            // Wait for navigation then scroll
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
    }, [navigate, selectedPage]);

    const handleGlobalFieldHighlight = useCallback((fieldKey: string) => {
        setHighlightedGlobalField(undefined);
        setTimeout(() => setHighlightedGlobalField(fieldKey), 0);
    }, []);

    const handlePublish = useCallback(async () => {
        // TODO: Implement validated publish with mutation hook
        console.log('[AdminLayout] Publish requested with message:', commitMessage);
    }, [commitMessage]);

    // Auth check
    const { isAuthenticated, loading } = useAuthContext();

    // Context value for child pages
    const contextValue = useMemo(() => ({
        selectedCommit,
        setSelectedCommit,
        selectedPage,
        setSelectedPage: (pageId: string) => {
            setSelectedPageState(pageId);
            if (activeView === 'content') {
                navigate(`/content/${pageId}`);
            }
        },
        globalSearchQuery,
        setGlobalSearchQuery,
        highlightedGlobalField,
        setHighlightedGlobalField,
    }), [selectedCommit, selectedPage, globalSearchQuery, highlightedGlobalField, activeView, navigate]);

    if (loading || isLoadingPages) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center space-y-4">
                    <Spinner className="mx-auto size-6 text-muted-foreground" />
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        if (typeof window !== 'undefined') {
            window.location.href = '/admin/login';
        }
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center space-y-4">
                    <Spinner className="mx-auto size-6 text-muted-foreground" />
                    <p className="text-muted-foreground">Redirecting to login...</p>
                </div>
            </div>
        );
    }

    return (
        <AdminLayoutContext.Provider value={contextValue}>
            <SidebarWrapper
                availablePages={pages}
                pagesData={pagesData}
                globalData={globalData}
                selectedPage={selectedPage}
                activeView={activeView}
                commitMessage={commitMessage}
                onCommitMessageChange={setCommitMessage}
                onPublish={handlePublish}
                globalSearchQuery={globalSearchQuery}
                onGlobalSearchChange={setGlobalSearchQuery}
                highlightedGlobalField={highlightedGlobalField}
                onGlobalFieldHighlight={handleGlobalFieldHighlight}
                globalFormData={globalFormData}
                onPageSelect={handlePageSelect}
                onComponentSelect={handleComponentSelect}
                onViewChange={handleViewChange}
                isAutoSaving={isAutoSaving}
                selectedCommit={selectedCommit}
                onCommitSelect={setSelectedCommit}
            >
                {/* The Outlet renders the child route's element */}
                <Outlet />
            </SidebarWrapper>
        </AdminLayoutContext.Provider>
    );
}

/**
 * Main layout for the Admin SPA.
 * Provides QueryClientProvider for TanStack Query data fetching.
 * Uses the original SidebarWrapper for the proper sidebar layout.
 */
export default function AdminLayout() {
    return (
        <QueryClientProvider client={queryClient}>
            <AdminLayoutInner />
        </QueryClientProvider>
    );
}
