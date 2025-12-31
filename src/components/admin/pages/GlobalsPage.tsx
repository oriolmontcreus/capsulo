import React, { useState, useCallback, useRef } from 'react';
import { useGlobalData } from '@/lib/api/hooks';
import { GlobalVariablesManager } from '@/components/admin/GlobalVariablesManager';
import { Loader2 } from 'lucide-react';
import type { GlobalData } from '@/lib/form-builder';

/**
 * Global Variables page wrapper for /admin/globals
 * Uses useGlobalData() hook to fetch global variables via TanStack Query.
 * Renders GlobalVariablesManager with the loaded data for editing.
 */
export default function GlobalsPage() {
    const { data: globalData, isLoading, error } = useGlobalData();

    // State for tracking changes and auto-save status
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isAutoSaving, setIsAutoSaving] = useState(false);

    // Ref for save function exposed by GlobalVariablesManager
    const saveRef = useRef<{ save: () => Promise<void> }>({ save: async () => { } });

    // Handle global data updates from GlobalVariablesManager
    const handleGlobalDataUpdate = useCallback((newGlobalData: GlobalData) => {
        // Future: could use TanStack Query mutation to update cache
        console.log('[GlobalsPage] Global data updated');
    }, []);

    // Placeholder revalidation callback
    const handleRevalidate = useCallback(() => {
        // Future: trigger revalidation after autosave
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold text-destructive mb-2">Error Loading Globals</h1>
                <p className="text-muted-foreground">{error.message}</p>
            </div>
        );
    }

    return (
        <GlobalVariablesManager
            initialData={globalData || { variables: [] }}
            onGlobalDataUpdate={handleGlobalDataUpdate}
            onSaveRef={saveRef}
            onHasChanges={setHasUnsavedChanges}
            onSaveStatusChange={setIsAutoSaving}
            onRevalidate={handleRevalidate}
        />
    );
}
