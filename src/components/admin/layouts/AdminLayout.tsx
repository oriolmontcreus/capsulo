

import { useEffect } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthContext } from '@/components/admin/AuthProvider';
import SidebarWrapper from '@/components/admin/SidebarWrapper';
import { usePages } from '@/lib/api/hooks';
import { useAdminNavigation } from '@/lib/stores';
import { Spinner } from '@/components/ui/spinner';


const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes default
            retry: 1,
        },
    },
});


function useActiveView(): 'content' | 'globals' | 'changes' | 'history' {
    const location = useLocation();
    const segments = location.pathname.split('/').filter(Boolean);
    const view = segments[0]; // First segment (relative to basename)

    if (view === 'globals') return 'globals';
    if (view === 'changes') return 'changes';
    if (view === 'history') return 'history';
    return 'content';
}


function AdminLayoutInner() {
    const { pageId } = useParams<{ pageId?: string }>();
    const activeView = useActiveView();


    const { data: pages = [], isLoading: isLoadingPages } = usePages();


    const { selectedPage, setSelectedPage } = useAdminNavigation();


    useEffect(() => {
        if (pageId && pageId !== selectedPage && pages.some(p => p.id === pageId)) {
            setSelectedPage(pageId);
        }
    }, [pageId, selectedPage, setSelectedPage, pages]);


    useEffect(() => {
        if (pages.length > 0 && !selectedPage) {
            setSelectedPage(pages[0].id);
        }
    }, [pages, selectedPage, setSelectedPage]);


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

export default function AdminLayout() {
    return (
        <QueryClientProvider client={queryClient}>
            <AdminLayoutInner />
        </QueryClientProvider>
    );
}
