import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePageData } from '@/lib/api/hooks';
import { Loader2, ArrowLeft } from 'lucide-react';

/**
 * Page Editor wrapper for /admin/content/:pageId
 * 
 * Extracts pageId from URL params and fetches page data via TanStack Query.
 * In a future phase, this will render CMSManager with the loaded data.
 */
export default function PageEditorPage() {
    const { pageId } = useParams<{ pageId: string }>();
    const { data: pageData, isLoading, error } = usePageData(pageId);

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

    const componentCount = pageData?.components?.length ?? 0;

    return (
        <div className="p-8">
            <Link to="../content" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
                <ArrowLeft className="h-4 w-4" />
                Back to pages
            </Link>

            <h1 className="text-2xl font-bold mb-4">
                Editing: <code className="px-2 py-1 rounded bg-muted text-xl">{pageId}</code>
            </h1>

            <div className="p-4 rounded-lg border bg-muted/50">
                <p className="font-medium mb-2">Page Data Loaded ✓</p>
                <p className="text-sm text-muted-foreground">
                    Found <strong>{componentCount}</strong> component{componentCount !== 1 ? 's' : ''} on this page.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                    CMSManager integration will be added in Phase 4 (Component Migration).
                </p>
            </div>

            {componentCount > 0 && (
                <div className="mt-6">
                    <h2 className="text-lg font-semibold mb-3">Components</h2>
                    <div className="space-y-2">
                        {pageData?.components.map((component, index) => (
                            <div key={component.id || index} className="p-3 rounded border bg-card">
                                <div className="font-medium">{component.schemaName}</div>
                                <div className="text-xs text-muted-foreground font-mono">{component.id}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
