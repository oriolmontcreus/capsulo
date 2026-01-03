import React, { useState, useCallback, useRef, useMemo } from 'react';
import { useGlobalData } from '@/lib/api/hooks';
import { useCommitFlow } from '@/lib/stores';
import { GlobalVariablesManager } from '@/components/admin/GlobalVariablesManager';
import { Loader2 } from 'lucide-react';
import type { GlobalData } from '@/lib/form-builder';
import { useValidation } from '@/lib/form-builder/context/ValidationContext';
import { validateAllDrafts } from '@/lib/validation/validateAllDrafts';

/**
 * Global Variables page wrapper for /admin/globals
 * Uses useGlobalData() hook to fetch global variables via TanStack Query.
 * Renders GlobalVariablesManager with the loaded data for editing.
 */
export default function GlobalsPage() {
    const { data: globalData, isLoading, error } = useGlobalData();

    // State for tracking changes and auto-save status
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const { setIsAutoSaving } = useCommitFlow();

    // Ref for save function exposed by GlobalVariablesManager
    const saveRef = useRef<{ save: () => Promise<void> }>({ save: async () => { } });

    // Handle global data updates from GlobalVariablesManager
    const handleGlobalDataUpdate = useCallback((newGlobalData: GlobalData) => {
        // Future: could use TanStack Query mutation to update cache
        console.log('[GlobalsPage] Global data updated');
    }, []);

    const { shouldAutoRevalidate, setValidationErrors } = useValidation();

    // Revalidate after autosave if requested
    const handleRevalidate = useCallback(async () => {
        if (shouldAutoRevalidate) {
            const validationResult = await validateAllDrafts();
            // Update errors - if they are fixed, this will clear them
            setValidationErrors(validationResult.errors, validationResult.errorList);
        }
    }, [shouldAutoRevalidate, setValidationErrors]);

    // Memoize initial data to prevent reload loops
    const initialData = useMemo(() => globalData || { variables: [] }, [globalData]);

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
            initialData={initialData}
            onGlobalDataUpdate={handleGlobalDataUpdate}
            onSaveRef={saveRef}
            onHasChanges={setHasUnsavedChanges}
            onSaveStatusChange={setIsAutoSaving}
            onRevalidate={handleRevalidate}
        />
    );
}
