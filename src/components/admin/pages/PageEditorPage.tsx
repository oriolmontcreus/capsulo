import React from 'react';
import { useParams } from 'react-router-dom';

/**
 * Page Editor wrapper for /admin/content/:pageId
 * 
 * Extracts pageId from URL params and renders the CMS editor.
 * In Phase 3, this will use usePageData(pageId) hook from TanStack Query.
 * For now, it displays placeholder content.
 */
export default function PageEditorPage() {
    const { pageId } = useParams<{ pageId: string }>();

    // In Phase 3, this will use:
    // const { data: pageData, isLoading, error } = usePageData(pageId);

    if (!pageId) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold text-destructive">Error</h1>
                <p>No page ID specified in URL.</p>
            </div>
        );
    }

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Page Editor</h1>
            <div className="p-4 rounded-lg border bg-muted/50">
                <p className="font-medium">Editing page: <code className="px-2 py-1 rounded bg-background">{pageId}</code></p>
                <p className="text-sm text-muted-foreground mt-2">
                    CMSManager component will be integrated here in Phase 3 with TanStack Query data hooks.
                </p>
            </div>
        </div>
    );
}
