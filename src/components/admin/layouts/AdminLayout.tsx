/**
 * AdminLayout - Main layout for the Admin SPA
 * 
 */

import { useEffect } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthContext } from '@/components/admin/AuthProvider';
import SidebarWrapper from '@/components/admin/SidebarWrapper';
import { usePages } from '@/lib/api/hooks';
import { useAdminNavigation } from '@/lib/stores';
import { Spinner } from '@/components/ui/spinner';

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
 * Deriving the active view from the current route path
 */
function useActiveView(): 'content' | 'globals' | 'changes' | 'history' {
    const location = useLocation();
    const segments = location.pathname.split('/').filter(Boolean);
    const view = segments[1]; // segment after 'admin'

    if (view === 'globals') return 'globals';
    if (view === 'changes') return 'changes';
    if (view === 'history') return 'history';
    return 'content';
}

/**
 * Inner layout component that syncs URL params with Zustand store
 */
function AdminLayoutInner() {
    const { pageId } = useParams<{ pageId?: string }>();
    const activeView = useActiveView();

    // Get pages for initialization
    const { data: pages = [], isLoading: isLoadingPages } = usePages();

    // Zustand store
    const { selectedPage, setSelectedPage } = useAdminNavigation();

    // Sync URL pageId param with store
    useEffect(() => {
        if (pageId && pageId !== selectedPage) {
            setSelectedPage(pageId);
        }
    }, [pageId, selectedPage, setSelectedPage]);

    // Initialize selectedPage when pages load
    useEffect(() => {
        if (pages.length > 0 && !selectedPage) {
            setSelectedPage(pages[0].id);
        }
    }, [pages, selectedPage, setSelectedPage]);

    // Auth check
    const { isAuthenticated, loading } = useAuthContext();

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
        // Only redirect if we are not already on the login page (to avoid loops)
        // AND we are not in the process of loading auth state
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin/login')) {
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
        <SidebarWrapper activeView={activeView}>
            <Outlet />
        </SidebarWrapper>
    );
}

/**
 * Main layout for the Admin SPA.
 * Provides QueryClientProvider for TanStack Query data fetching.
 */
export default function AdminLayout() {
    return (
        <QueryClientProvider client={queryClient}>
            <AdminLayoutInner />
        </QueryClientProvider>
    );
}
