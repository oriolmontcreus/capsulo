import React, { useState, useMemo } from 'react';
import { usePages, usePageData, useGlobalData } from '@/lib/api/hooks';
import { ChangesManager } from '@/components/admin/ChangesViewer/ChangesManager';
import { Loader2 } from 'lucide-react';
import type { PageData } from '@/lib/form-builder';

/**
 * Changes page wrapper for /admin/changes
 * 
 * Shows uncommitted changes (diff between local drafts and remote).
 * Allows page selection to view specific page changes.
 */
export default function ChangesPage() {
    const { data: pages = [], isLoading: pagesLoading } = usePages();
    const { data: globalData } = useGlobalData();

    // Default to first available page or 'globals'
    const [selectedPageId, setSelectedPageId] = useState<string>('');

    // Auto-select first page when pages load
    React.useEffect(() => {
        if (!selectedPageId && pages.length > 0) {
            setSelectedPageId(pages[0].id);
        }
    }, [pages, selectedPageId]);

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

    // Options for page selector
    const pageOptions = [
        ...pages.map(p => ({ id: p.id, name: p.name })),
        { id: 'globals', name: 'Global Variables' }
    ];

    return (
        <div className="h-full flex flex-col">
            {/* Header with page selector */}
            <div className="p-4 border-b bg-background shrink-0">
                <div className="flex items-center gap-4">
                    <h1 className="text-lg font-semibold">Uncommitted Changes</h1>
                    <select
                        value={selectedPageId}
                        onChange={(e) => setSelectedPageId(e.target.value)}
                        className="px-3 py-1.5 rounded-md border bg-background text-sm"
                    >
                        {pageOptions.map(option => (
                            <option key={option.id} value={option.id}>
                                {option.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Changes Manager */}
            <div className="flex-1 overflow-hidden">
                {selectedPageId && (
                    <ChangesManager
                        key={selectedPageId}
                        pageId={selectedPageId}
                        pageName={selectedPageName}
                        localData={localData}
                    />
                )}
            </div>
        </div>
    );
}
