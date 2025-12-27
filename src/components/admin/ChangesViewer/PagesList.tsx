import { FileTextIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChangeItem {
    id: string;
    name: string;
    hasChanges: boolean;
}

interface PagesListProps {
    pagesWithChanges: ChangeItem[];
    globalsHasChanges: boolean;
    isLoading: boolean;
    selectedPage: string;
    onPageSelect: (pageId: string) => void;
    title?: string;
    className?: string;
}

export function PagesList({
    pagesWithChanges,
    globalsHasChanges,
    isLoading,
    selectedPage,
    onPageSelect,
    title = 'WIP',
    className = ''
}: PagesListProps) {
    const hasAnyChanges = globalsHasChanges || pagesWithChanges.length > 0;

    return (
        <div className={`flex-1 overflow-auto ${className}`}>
            <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {title}
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking for changes...
                </div>
            ) : !hasAnyChanges ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No changes to commit
                </div>
            ) : (
                <ul className="space-y-0.5 px-2">
                    {globalsHasChanges && (
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
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            </button>
                        </li>
                    )}
                    {pagesWithChanges.map((page) => (
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
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
