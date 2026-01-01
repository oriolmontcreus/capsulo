import { useMemo } from 'react';
import { usePages, usePageData, useGlobalData } from '@/lib/api/hooks';
import { ChangesManager } from '@/components/admin/ChangesViewer/ChangesManager';
import { Loader2 } from 'lucide-react';
import type { PageData } from '@/lib/form-builder';
import { useAdminNavigation, useCommitFlow } from '@/lib/stores';

/**
 * Changes page wrapper for /admin/changes
 * 
 * Shows uncommitted changes (diff between local drafts and remote).
 * Uses Zustand stores for navigation state.
 */
export default function ChangesPage() {
    const { data: pages = [], isLoading: pagesLoading } = usePages();
    const { data: globalData } = useGlobalData();
    const { selectedPage } = useAdminNavigation();
    const { lastCommitTimestamp } = useCommitFlow();

    // Use store selected page, defaulting to first available page
    const selectedPageId = selectedPage || pages[0]?.id || '';

    // Fetch selected page data
    const { data: pageData } = usePageData(selectedPageId !== 'globals' ? selectedPageId : undefined);

    // Get friendly name for selected page
    const selectedPageName = useMemo(() => {
        if (selectedPageId === 'globals') return 'Global Variables';
        const page = pages.find(p => p.id === selectedPageId);
        return page?.name || selectedPageId;
    }, [selectedPageId, pages]);

    // Build local data for ChangesManager
    const localData: PageData = useMemo(() => {
        if (selectedPageId === 'globals') {
            return { components: globalData?.variables || [] };
        }
        return pageData || { components: [] };
    }, [selectedPageId, pageData, globalData]);

    if (pagesLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!selectedPageId) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                    <p className="text-lg font-medium">No page selected</p>
                    <p className="text-sm mt-1">Select a page from the sidebar</p>
                </div>
            </div>
        );
    }

    return (
        <ChangesManager
            key={selectedPageId}
            pageId={selectedPageId}
            pageName={selectedPageName}
            localData={localData}
            lastCommitTimestamp={lastCommitTimestamp}
        />
    );
}
