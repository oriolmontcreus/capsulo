import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { DiffView } from './DiffView';
import type { UndoFieldInfo } from './types';
import { useAuthContext } from '../AuthProvider';
import type { PageData } from '@/lib/form-builder';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    getPageDraft,
    getGlobalsDraft,
    updateFieldInPageDraft,
    updateFieldInGlobalsDraft
} from '@/lib/cms-local-changes';
import { fetchRemotePageData } from './utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChangesManagerProps {
    pageId: string;
    pageName: string;
    localData: PageData; // Fallback if no localStorage draft exists
    lastCommitTimestamp?: number;
}

export const ChangesManager = ({ pageId, pageName, localData, lastCommitTimestamp }: ChangesManagerProps) => {
    const { token } = useAuthContext();
    const [remoteData, setRemoteData] = useState<PageData | null>(null);
    const [loading, setLoading] = useState(true); // Start with loading true
    const [error, setError] = useState<string | null>(null);
    const [isVisible, setIsVisible] = useState(false); // For fade-in animation
    const [refreshKey, setRefreshKey] = useState(0); // Trigger re-render after undo
    const prevPageIdRef = useRef<string | null>(null);

    // Get local data from localStorage draft, falling back to prop
    // Note: lastCommitTimestamp is included to force recalculation after a commit clears drafts
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

        // If no local draft exists, we align with remoteData to show "no changes"
        // This avoids confusion where local disk files differ from the remote draft branch
        if (remoteData) {
            return remoteData;
        }

        return localData;
    }, [pageId, localData, refreshKey, remoteData, lastCommitTimestamp]);

    // Handle undoing a single field change
    const handleUndoField = useCallback((info: UndoFieldInfo) => {
        const { componentId, fieldName, locale, oldValue, fieldType } = info;

        let success = false;
        if (pageId === 'globals') {
            success = updateFieldInGlobalsDraft(componentId, fieldName, oldValue, locale, fieldType);
        } else {
            success = updateFieldInPageDraft(pageId, componentId, fieldName, oldValue, locale, fieldType);
        }

        if (success) {
            setRefreshKey(prev => prev + 1);
            window.dispatchEvent(new CustomEvent('cms-changes-updated'));
        }
    }, [pageId]);

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
            if (rafId !== null) cancelAnimationFrame(rafId);
        };
    }, [pageId, token, lastCommitTimestamp]);

    // Listen for changes updated event (e.g., from "Undo All" action)
    useEffect(() => {
        const handleChangesUpdated = () => {
            setRefreshKey(prev => prev + 1);
        };

        window.addEventListener('cms-changes-updated', handleChangesUpdated);
        return () => window.removeEventListener('cms-changes-updated', handleChangesUpdated);
    }, []);

    const showLoadingSpinner = loading && !remoteData;

    return (
        <ScrollArea className="flex-1 overflow-auto">
            {loading && remoteData && (
                <div className="fixed top-4 right-4 flex items-center text-sm text-muted-foreground bg-card/80 backdrop-blur-sm border rounded-lg px-3 py-2 shadow-sm z-50">
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Refreshing...
                </div>
            )}

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
                        onUndoField={handleUndoField}
                    />
                </div>
            )}
        </ScrollArea>
    );
};
