import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { PageInfo } from '@/components/admin/AppWrapper';
import { FileTextIcon, GitCommitIcon } from 'lucide-react';

interface ChangesSidebarProps {
    availablePages: PageInfo[];
    selectedPage: string;
    onPageSelect: (pageId: string) => void;
    commitMessage: string;
    onCommitMessageChange: (message: string) => void;
    onPublish: () => void;
}

export function ChangesSidebar({
    availablePages,
    selectedPage,
    onPageSelect,
    commitMessage,
    onCommitMessageChange,
    onPublish
}: ChangesSidebarProps) {
    return (
        <div className="flex bg-sidebar h-full flex-col border-r w-[250px] min-w-[250px]">
            <div className="p-4 font-semibold text-sidebar-foreground flex items-center gap-2 border-b">
                <GitCommitIcon className="w-4 h-4" />
                Commit
            </div>

            <div className="p-4 flex flex-col gap-4 border-b">
                <Textarea
                    placeholder="Your commit message..."
                    className="resize-none h-24 text-sm"
                    value={commitMessage}
                    onChange={(e) => onCommitMessageChange(e.target.value)}
                />
                <Button
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold"
                    onClick={onPublish}
                >
                    Commit to playground (Enter)
                </Button>
            </div>

            <div className="flex-1 overflow-auto">
                <div className="px-4 py-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
                    WIP
                </div>
                <ul className="space-y-0.5 px-2">
                    {availablePages.map((page) => (
                        <li key={page.id}>
                            <button
                                onClick={() => onPageSelect(page.id)}
                                className={cn(
                                    "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors",
                                    selectedPage === page.id
                                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                        : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                                )}
                            >
                                <FileTextIcon className="w-4 h-4 opacity-70" />
                                <span className="truncate">{page.name}</span>
                                {/* Mock indicator for changes */}
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 opacity-100" />
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
