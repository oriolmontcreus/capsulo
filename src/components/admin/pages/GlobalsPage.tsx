import React from 'react';
import { useGlobalData } from '@/lib/api/hooks';
import { Loader2 } from 'lucide-react';

/**
 * Global Variables page wrapper for /admin/globals
 * Uses useGlobalData() hook to fetch global variables via TanStack Query.
 */
export default function GlobalsPage() {
    const { data: globalData, isLoading, error } = useGlobalData();

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

    const variableCount = globalData?.variables?.length ?? 0;

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Global Variables</h1>

            <div className="p-4 rounded-lg border bg-muted/50">
                <p className="font-medium mb-2">Global Data Loaded ✓</p>
                <p className="text-sm text-muted-foreground">
                    Found <strong>{variableCount}</strong> global variable{variableCount !== 1 ? 's' : ''}.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                    GlobalVariablesManager integration will be added in Phase 4 (Component Migration).
                </p>
            </div>

            {variableCount > 0 && (
                <div className="mt-6">
                    <h2 className="text-lg font-semibold mb-3">Variables</h2>
                    <div className="space-y-2">
                        {globalData?.variables.map((variable: any, index: number) => (
                            <div key={variable.id || index} className="p-3 rounded border bg-card">
                                <div className="font-medium">{variable.name || variable.id}</div>
                                <div className="text-xs text-muted-foreground font-mono">{variable.id}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
