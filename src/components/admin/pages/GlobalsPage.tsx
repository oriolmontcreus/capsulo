import React from 'react';

/**
 * Global Variables page wrapper for /admin/globals
 * 
 * In Phase 3, this will use useGlobalData() hook from TanStack Query.
 * For now, it displays placeholder content.
 */
export default function GlobalsPage() {
    // In Phase 3, this will use:
    // const { data: globalData, isLoading, error } = useGlobalData();

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Global Variables</h1>
            <div className="p-4 rounded-lg border bg-muted/50">
                <p className="text-muted-foreground">
                    GlobalVariablesManager component will be integrated here in Phase 3 with TanStack Query data hooks.
                </p>
            </div>
        </div>
    );
}
