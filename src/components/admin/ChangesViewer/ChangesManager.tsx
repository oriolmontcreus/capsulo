import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DiffView } from './DiffView';
import { useAuthContext } from '../AuthProvider';
import type { PageData } from '@/lib/form-builder';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getPageDraft, getGlobalsDraft } from '@/lib/cms-local-changes';

interface ChangesManagerProps {
    pageId: string;
    pageName: string;
    localData: PageData; // Fallback if no localStorage draft exists
}

export const ChangesManager: React.FC<ChangesManagerProps> = ({ pageId, pageName, localData }) => {
    const { token } = useAuthContext();
    const [remoteData, setRemoteData] = useState<PageData | null>(null);
    const [loading, setLoading] = useState(true); // Start with loading true
    const [error, setError] = useState<string | null>(null);
    const [isVisible, setIsVisible] = useState(false); // For fade-in animation
    const prevPageIdRef = useRef<string | null>(null);

    // Get local data from localStorage draft, falling back to prop
    const currentLocalData = useMemo<PageData>(() => {
        if (pageId === 'globals') {
            const globalsDraft = getGlobalsDraft();
            if (globalsDraft) {
                return { components: globalsDraft.variables };
            }
        } else {
            const pageDraft = getPageDraft(pageId);
            if (pageDraft) {
                return pageDraft;
            }
        }
        return localData;
    }, [pageId, localData]);

    useEffect(() => {
        if (!pageId || !token) return;

        // Reset state when pageId changes to prevent showing stale data
        if (prevPageIdRef.current !== pageId) {
            setRemoteData(null);
            setIsVisible(false);
            setError(null);
            prevPageIdRef.current = pageId;
        }

        const fetchRemoteData = async () => {
            setLoading(true);
            setError(null);
            try {
                const fileName = pageId === "home" ? "index" : pageId;

                // First try to fetch from draft branch (what's currently saved)
                // This allows comparing in-memory edits against the saved draft
                let response = await fetch(`/api/cms/changes?page=${encodeURIComponent(fileName)}&branch=draft`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                let result = await response.json();

                // If draft branch doesn't exist, fall back to main branch
                if (!response.ok || (result.data === null && result.message?.includes('does not exist'))) {
                    response = await fetch(`/api/cms/changes?page=${encodeURIComponent(fileName)}&branch=main`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to fetch remote data');
                    }

                    result = await response.json();
                }

                const fetchedData = result.data || { components: [] };

                // Map GlobalData to PageData if needed
                if ('variables' in fetchedData) {
                    setRemoteData({ components: fetchedData.variables });
                } else {
                    setRemoteData(fetchedData);
                }

                // Trigger fade-in after data is set
                requestAnimationFrame(() => {
                    setIsVisible(true);
                });
            } catch (err: any) {
                console.error('Error fetching remote data:', err);
                setError(err.message || 'Failed to load remote data from GitHub.');
                setRemoteData({ components: [] });
                // Still show content on error
                requestAnimationFrame(() => {
                    setIsVisible(true);
                });
            } finally {
                setLoading(false);
            }
        };

        fetchRemoteData();
    }, [pageId, token]);

    const showLoadingSpinner = loading && !remoteData;

    return (
        <div className="flex-1 overflow-auto">
            <header className="px-8 py-6 border-b flex justify-between items-center">
                <h1 className="text-2xl font-bold tracking-tight">Changes: {pageName}</h1>
                {loading && remoteData && (
                    <div className="flex items-center text-sm text-muted-foreground">
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Refreshing...
                    </div>
                )}
            </header>

            {error && !showLoadingSpinner && (
                <div
                    className="p-8 transition-opacity duration-300"
                    style={{ opacity: isVisible ? 1 : 0 }}
                >
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                </div>
            )}

            {showLoadingSpinner ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <RefreshCw className="h-8 w-8 mb-4 animate-spin opacity-40" />
                    <p className="text-sm">Loading comparison data...</p>
                </div>
            ) : remoteData && (
                <div
                    className="transition-opacity duration-300 ease-out"
                    style={{ opacity: isVisible ? 1 : 0 }}
                >
                    <DiffView
                        oldPageData={remoteData}
                        newPageData={currentLocalData}
                    />
                </div>
            )}
        </div>
    );
};
