import React, { useState } from 'react';
import { HistoryList, CommitViewer } from '@/components/admin/HistoryViewer';

/**
 * History page wrapper for /admin/history
 * 
 * Renders commit history list in sidebar and CommitViewer for selected commits.
 */
export default function HistoryPage() {
    const [selectedCommit, setSelectedCommit] = useState<string | null>(null);

    return (
        <div className="h-full flex">
            {/* Commit list sidebar */}
            <div className="w-80 border-r bg-muted/10 shrink-0">
                <HistoryList
                    selectedCommit={selectedCommit}
                    onCommitSelect={setSelectedCommit}
                    className="h-full"
                />
            </div>

            {/* Commit details */}
            <div className="flex-1 overflow-hidden">
                {selectedCommit ? (
                    <CommitViewer commitSha={selectedCommit} />
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        <div className="text-center">
                            <p className="text-lg font-medium">No commit selected</p>
                            <p className="text-sm mt-1">Select a commit from the list to view details</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
