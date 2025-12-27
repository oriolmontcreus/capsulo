import React from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface SaveError {
    type: 'page' | 'globals';
    id: string;
    error: string;
}

interface SaveErrorDialogProps {
    errors: SaveError[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SaveErrorDialog({ errors, open, onOpenChange }: SaveErrorDialogProps) {
    return (
        <>
            {/* Error Dialog */}
            <AlertDialog open={open} onOpenChange={onOpenChange}>
                <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Save Errors</AlertDialogTitle>
                        <AlertDialogDescription>
                            The following items failed to save. Please review the errors and try again.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4 py-4">
                        {errors.map((error, index) => (
                            <div key={index} className="border rounded-lg p-4 bg-destructive/5">
                                <div className="font-semibold text-sm mb-2">
                                    {error.type === 'page' ? 'Page' : 'Global Variables'}: {error.id}
                                </div>
                                <div className="text-sm text-muted-foreground font-mono bg-muted p-2 rounded">
                                    {error.error}
                                </div>
                            </div>
                        ))}
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => onOpenChange(false)}>
                            Close
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Floating "View Errors" button */}
            {errors.length > 0 && !open && (
                <button
                    onClick={() => onOpenChange(true)}
                    className="fixed bottom-6 right-6 z-50 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg shadow-lg hover:bg-destructive/90 transition-colors flex items-center gap-2"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    View Errors ({errors.length})
                </button>
            )}
        </>
    );
}
