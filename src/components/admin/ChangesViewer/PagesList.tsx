import { FileTextIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PageInfo } from '@/components/admin/AppWrapper';

interface PagesListProps {
    pages: PageInfo[];
    selectedPage: string;
    onPageSelect: (pageId: string) => void;
    title?: string;
    className?: string;
}

export function PagesList({
    pages,
    selectedPage,
    onPageSelect,
    title = 'WIP',
    className = ''
}: PagesListProps) {
    return (
        <div className={`flex-1 overflow-auto ${className}`}>
            <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {title}
            </div>
            <ul className="space-y-0.5 px-2">
                <li key="globals">
                    <button
                        type="button"
                        onClick={() => onPageSelect('globals')}
                        className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors text-left",
                            selectedPage === 'globals'
                                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                        )}
                    >
                        <FileTextIcon className="w-4 h-4 opacity-70" />
                        <span className="truncate flex-1">Global Variables</span>
                        {/* Always show for now if we can't easily detect changes here */}
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    </button>
                </li>
                {pages.map((page) => (
                    <li key={page.id}>
                        <button
                            type="button"
                            onClick={() => onPageSelect(page.id)}
                            className={cn(
                                "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors text-left",
                                selectedPage === page.id
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                            )}
                        >
                            <FileTextIcon className="w-4 h-4 opacity-70" />
                            <span className="truncate flex-1">{page.name}</span>
                            {/* Indicator for changes */}
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
