import React from 'react';
import { useNavigate } from 'react-router-dom';

interface PageInfo {
    id: string;
    name: string;
    path: string;
}

interface ContentListPageProps {
    availablePages?: PageInfo[];
}

/**
 * Landing page for /admin/content
 * Shows list of available pages and allows navigation to editor.
 * 
 * In Phase 3, this will use usePages() hook from TanStack Query.
 * For now, it receives pages via props or context.
 */
export default function ContentListPage({ availablePages = [] }: ContentListPageProps) {
    const navigate = useNavigate();

    const handlePageSelect = (pageId: string) => {
        navigate(`/admin/content/${pageId}`);
    };

    // If we have pages passed in, show the list
    // Otherwise show a placeholder
    if (availablePages.length === 0) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold mb-4">Content Pages</h1>
                <p className="text-muted-foreground">
                    No pages available. Pages will be loaded from the API in Phase 3.
                </p>
            </div>
        );
    }

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-6">Content Pages</h1>
            <div className="grid gap-3">
                {availablePages.map((page) => (
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
