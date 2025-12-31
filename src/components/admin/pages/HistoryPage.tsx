import React, { useState } from 'react';

/**
 * History page wrapper for /admin/history
 * 
 * Renders commit history list and CommitViewer for selected commits.
 * Uses local state for commit selection (could be moved to URL params later).
 */
export default function HistoryPage() {
    const [selectedCommit, setSelectedCommit] = useState<string | null>(null);

    // In Phase 3, this will use:
    // const { data: commits, isLoading, error } = useCommitHistory();

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Commit History</h1>
            <div className="p-4 rounded-lg border bg-muted/50">
                <p className="text-muted-foreground">
                    HistoryList and CommitViewer components will be integrated here.
                </p>
                {selectedCommit && (
                    <p className="mt-2 text-sm">
                        Selected commit: <code className="px-2 py-1 rounded bg-background">{selectedCommit}</code>
                    </p>
                )}
            </div>
        </div>
    );
}
