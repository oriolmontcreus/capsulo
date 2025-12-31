import { useState } from 'react';
import { FileTextIcon, Loader2, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePreferences } from '@/lib/context/PreferencesContext';
import { clearAllDrafts } from '@/lib/cms-local-changes';
import { ScrollArea } from '@/components/ui/scroll-area';

import { type ChangeItem } from './types';

interface ChangeListItemProps {
    id: string;
    name: string;
    isSelected: boolean;
    onSelect: () => void;
}

function ChangeListItem({ id, name, isSelected, onSelect }: ChangeListItemProps) {
    return (
        <li key={id}>
            <button
                type="button"
                onClick={onSelect}
                className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors text-left",
                    isSelected
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
            >
                <FileTextIcon className="w-4 h-4 opacity-70" />
                <span className="truncate flex-1">{name}</span>
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            </button>
        </li>
    );
}

interface PagesListProps {
    pagesWithChanges: ChangeItem[];
    globalsHasChanges: boolean;
    isLoading: boolean;
    selectedPage: string;
    onPageSelect: (pageId: string) => void;
    onUndoAll?: () => void;
    title?: string;
    className?: string;
}

export function PagesList({
    pagesWithChanges,
    globalsHasChanges,
    isLoading,
    selectedPage,
    onPageSelect,
    onUndoAll,
    title = 'WIP',
    className = ''
}: PagesListProps) {
    const { shouldConfirm } = usePreferences();
    const [showUndoConfirmation, setShowUndoConfirmation] = useState(false);
    const hasAnyChanges = globalsHasChanges || pagesWithChanges.length > 0;

    const handleUndoAll = () => {
        if (shouldConfirm('undoAllChanges')) {
            setShowUndoConfirmation(true);
        } else {
            performUndoAll();
        }
    };

    const performUndoAll = () => {
        try {
            clearAllDrafts();
            window.dispatchEvent(new CustomEvent('cms-changes-updated'));
            onUndoAll?.();
            setShowUndoConfirmation(false);
        } catch (error) {
            console.error('Failed to clear drafts:', error);
            setShowUndoConfirmation(false);
        }
    };

    return (
        <>
            <ScrollArea className={`flex-1 overflow-auto ${className}`}>
                <div className="p-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {title}
                    </span>
                    {hasAnyChanges && !isLoading && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleUndoAll}
                                    className="h-6 w-6 text-muted-foreground"
                                >
                                    <Undo2 className="w-3.5 h-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                Discard all changes
                            </TooltipContent>
                        </Tooltip>
                    )}
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
                            <ChangeListItem
                                key="globals"
                                id="globals"
                                name="Global Variables"
                                isSelected={selectedPage === 'globals'}
                                onSelect={() => onPageSelect('globals')}
                            />
                        )}
                        {pagesWithChanges.map((page) => (
                            <ChangeListItem
                                key={page.id}
                                id={page.id}
                                name={page.name}
                                isSelected={selectedPage === page.id}
                                onSelect={() => onPageSelect(page.id)}
                            />
                        ))}
                    </ul>
                )}
            </ScrollArea>

            <AlertDialog open={showUndoConfirmation} onOpenChange={setShowUndoConfirmation}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Undo All Changes?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will revert all uncommitted changes across all pages and global variables.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={performUndoAll}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Undo All Changes
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

