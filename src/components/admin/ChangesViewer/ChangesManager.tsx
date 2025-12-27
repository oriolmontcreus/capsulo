import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DiffView } from './DiffView';
import { useAuthContext } from '../AuthProvider';
import type { PageData } from '@/lib/form-builder';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getPageDraft, getGlobalsDraft } from '@/lib/cms-local-changes';
import { fetchRemotePageData } from './utils';

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

        const controller = new AbortController();
        const { signal } = controller;
        let rafId: number | null = null;

        // Reset state when pageId changes to prevent showing stale data
        if (prevPageIdRef.current !== pageId) {
            setRemoteData(null);
            setIsVisible(false);
            setError(null);
            prevPageIdRef.current = pageId;
        }

        const fetchRemoteData = async () => {
            if (signal.aborted) return;
            setLoading(true);
            setError(null);
            try {
                const fetchedData = await fetchRemotePageData(pageId, token, signal);

                if (signal.aborted) return;

                setRemoteData(fetchedData || { components: [] });

                // Trigger fade-in after data is set
                if (!signal.aborted) {
                    rafId = requestAnimationFrame(() => {
                        if (!signal.aborted) setIsVisible(true);
                    });
                }
            } catch (err: any) {
                if (err.name === 'AbortError') return;

                console.error('Error fetching remote data:', err);
                if (!signal.aborted) {
                    setError(err.message || 'Failed to load remote data from GitHub.');
                    setRemoteData({ components: [] });
                    // Still show content on error
                    rafId = requestAnimationFrame(() => {
                        if (!signal.aborted) setIsVisible(true);
                    });
                }
            } finally {
                if (!signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchRemoteData();

        return () => {
            controller.abort();
            if (rafId) cancelAnimationFrame(rafId);
        };
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
