import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePages } from '@/lib/api/hooks';
import { Loader2 } from 'lucide-react';

/**
 * Landing page for /admin/content
 * Shows list of available pages and allows navigation to editor.
 * Uses usePages() hook to fetch page list via TanStack Query.
 */
export default function ContentListPage() {
    const navigate = useNavigate();
    const { data: pages, isLoading, error } = usePages();

    const handlePageSelect = (pageId: string) => {
        // Navigate to the page - just use pageId since we're already on /content
        navigate(pageId);
    };

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
                <h1 className="text-2xl font-bold text-destructive mb-2">Error Loading Pages</h1>
                <p className="text-muted-foreground">{error.message}</p>
            </div>
        );
    }

    if (!pages || pages.length === 0) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold mb-4">Content Pages</h1>
                <p className="text-muted-foreground">
                    No pages with CMS components found.
                </p>
            </div>
        );
    }

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-6">Content Pages</h1>
            <div className="grid gap-3">
                {pages.map((page) => (
                    <button
                        key={page.id}
                        onClick={() => handlePageSelect(page.id)}
                        className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent transition-colors text-left"
                    >
                        <div className="flex-1">
                            <div className="font-medium">{page.name}</div>
                            <div className="text-sm text-muted-foreground">{page.path}</div>
                        </div>
                        <span className="text-muted-foreground">→</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
