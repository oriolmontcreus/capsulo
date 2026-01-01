import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePages } from '@/lib/api/hooks';
import { Loader2, FileText } from 'lucide-react';

/**
 * Landing page for /admin/content
 * Automatically redirects to the first available page.
 * Falls back to empty state if no pages exist.
 */
export default function ContentListPage() {
    const navigate = useNavigate();
    const { data: pages, isLoading, error } = usePages();

    useEffect(() => {
        if (pages && pages.length > 0) {
            navigate(pages[0].id, { replace: true });
        }
    }, [pages, navigate]);

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
                <h1 className="text-2xl font-bold text-destructive mb-2">Error Loading Pages</h1>
                <p className="text-muted-foreground">{error.message}</p>
            </div>
        );
    }

    // Only show "No Pages" if we really have no pages and aren't redirecting
    if (!pages || pages.length === 0) {
        return (
            <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <h1 className="text-xl font-medium mb-2">No Pages Found</h1>
                <p className="text-muted-foreground">
                    No pages with CMS components found.
                </p>
            </div>
        );
    }

    // Show loading while redirecting
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
}
