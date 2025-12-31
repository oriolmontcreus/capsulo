import React from 'react';

/**
 * Changes page wrapper for /admin/changes
 * 
 * Shows uncommitted changes (diff between local drafts and remote).
 */
export default function ChangesPage() {
    // In Phase 3, this will receive pageId from context or use a selection mechanism

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Uncommitted Changes</h1>
            <div className="p-4 rounded-lg border bg-muted/50">
                <p className="text-muted-foreground">
                    ChangesManager component will be integrated here to show local draft changes vs. remote.
                </p>
            </div>
        </div>
    );
}
