import React, { useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { usePageData, usePages } from '@/lib/api/hooks';
import { CMSManager } from '@/components/admin/CMSManager';
import { Loader2 } from 'lucide-react';
import { useCommitFlow } from '@/lib/stores';
import type { PageData } from '@/lib/form-builder';

/**
 * Page Editor wrapper for /admin/content/:pageId
 * 
 * Extracts pageId from URL params and fetches page data via TanStack Query.
 * Renders CMSManager with the loaded data for editing.
 */
export default function PageEditorPage() {
    const { pageId } = useParams<{ pageId: string }>();
    const { data: pageData, isLoading, error } = usePageData(pageId);
    const { data: availablePages = [] } = usePages();

    // State for tracking changes and auto-save status
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const { setIsAutoSaving } = useCommitFlow();

    // Refs for save/reorder functions exposed by CMSManager
    const saveRef = useRef<{ save: () => Promise<void> }>({ save: async () => { } });
    const reorderRef = useRef<{ reorder: (pageId: string, newComponentIds: string[]) => void }>({ reorder: () => { } });

    // Handle page data updates from CMSManager
    const handlePageDataUpdate = useCallback((pageId: string, newPageData: PageData) => {
        // Future: could use TanStack Query mutation to update cache
        console.log('[PageEditorPage] Page data updated:', pageId);
    }, []);

    // Placeholder revalidation callback
    const handleRevalidate = useCallback(() => {
        // Future: trigger revalidation after autosave
    }, []);

    // Build initial data structure expected by CMSManager
    const initialData = React.useMemo(() => ({
        [pageId || '']: pageData || { components: [] }
    }), [pageId, pageData]);

    if (!pageId) {
        return (
            <div className="text-center py-12">
                <h1 className="text-2xl font-bold text-destructive">Error</h1>
                <p className="text-muted-foreground mt-2">No page ID specified in URL.</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <h1 className="text-2xl font-bold text-destructive mb-2">Error Loading Page</h1>
                <p className="text-muted-foreground">{error.message}</p>
            </div>
        );
    }

    return (
        <CMSManager
            initialData={initialData}
            availablePages={availablePages}
            selectedPage={pageId}
            onPageChange={() => { }} // Navigation is via router, not this callback
            onPageDataUpdate={handlePageDataUpdate}
            onSaveRef={saveRef}
            onReorderRef={reorderRef}
            onHasChanges={setHasUnsavedChanges}
            onSaveStatusChange={setIsAutoSaving}
            onRevalidate={handleRevalidate}
        />
    );
}
