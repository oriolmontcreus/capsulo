import React, { useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePageData, usePages } from '@/lib/api/hooks';
import { CMSManager } from '@/components/admin/CMSManager';
import { Loader2, ArrowLeft } from 'lucide-react';
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
    const [isAutoSaving, setIsAutoSaving] = useState(false);

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

    if (!pageId) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold text-destructive">Error</h1>
                <p>No page ID specified in URL.</p>
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
            <div className="p-8">
                <Link to="../content" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
                    <ArrowLeft className="h-4 w-4" />
                    Back to pages
                </Link>
                <h1 className="text-2xl font-bold text-destructive mb-2">Error Loading Page</h1>
                <p className="text-muted-foreground">{error.message}</p>
            </div>
        );
    }

    // Build initial data structure expected by CMSManager
    const initialData: Record<string, PageData> = {
        [pageId]: pageData || { components: [] }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header with back navigation */}
            <div className="p-4 border-b bg-background shrink-0">
                <Link to="../content" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" />
                    Back to pages
                </Link>
                <div className="flex items-center gap-2 mt-2">
                    <h1 className="text-lg font-semibold">
                        Editing: <code className="px-2 py-0.5 rounded bg-muted text-base">{pageId}</code>
                    </h1>
                    {isAutoSaving && (
                        <span className="text-xs text-muted-foreground animate-pulse">Saving...</span>
                    )}
                    {hasUnsavedChanges && !isAutoSaving && (
                        <span className="text-xs text-amber-500">Unsaved changes</span>
                    )}
                </div>
            </div>

            {/* CMSManager */}
            <div className="flex-1 overflow-auto">
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
            </div>
        </div>
    );
}
