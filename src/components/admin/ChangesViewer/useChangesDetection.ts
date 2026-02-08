import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getChangedPageIds, hasGlobalsDraft } from '@/lib/cms-local-changes';

import type { ChangeItem } from './types';
import { fileNameToPageId } from './utils';

interface UseChangesDetectionOptions {
    /**
     * If false, the hook will not run change detection.
     * Use this to defer detection until the user navigates to the changes view.
     * @default true
     */
    enabled?: boolean;
}

interface UseChangesDetectionResult {
    pagesWithChanges: ChangeItem[];
    globalsHasChanges: boolean;
    isLoading: boolean;
    refresh: () => void;
}

export function useChangesDetection(
    availablePages: Array<{ id: string; name: string }>,
    token: string | null,
    options: UseChangesDetectionOptions = {}
): UseChangesDetectionResult {
    const { enabled = true } = options;

    const [pagesWithChanges, setPagesWithChanges] = useState<ChangeItem[]>([]);
    const [globalsHasChanges, setGlobalsHasChanges] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const isInitialLoadRef = useRef(true);
    const hasEverRunRef = useRef(false);

    // Stabilize the available pages by creating a string key
    // This prevents re-runs when the array reference changes but content is the same
    const stablePageIds = useMemo(() =>
        availablePages.map(p => p.id).sort().join(','),
        [availablePages]
    );

    const refresh = useCallback(() => {
        setRefreshKey(prev => prev + 1);
    }, []);

    useEffect(() => {
        if (!token) {
            setIsLoading(false);
            return;
        }

        const detectChanges = async () => {
            // Only show loading spinner on initial load, not on refreshes
            if (isInitialLoadRef.current) {
                setIsLoading(true);
            }

            try {
                const changedPageIds = await getChangedPageIds();
                const results: ChangeItem[] = [];

                // Check each page that has an IndexedDB draft
                for (const pageId of changedPageIds) {
                    if (pageId === 'globals') continue;

                    // Handle the index <-> home ID mapping
                    const normalizedPageId = fileNameToPageId(pageId);

                    // Try to find page by both the original ID and normalized ID
                    const pageInfo = availablePages.find(p => p.id === pageId)
                        || availablePages.find(p => p.id === normalizedPageId);
                    const pageName = pageInfo?.name || (pageId === 'index' ? 'Home' : pageId);
                    // Use the ID from availablePages if found, otherwise use normalized ID
                    const displayId = pageInfo?.id || normalizedPageId;

                    results.push({
                        id: displayId,
                        name: pageName
                    });
                }

                // Check globals
                const hasGlobals = await hasGlobalsDraft();
                setGlobalsHasChanges(hasGlobals);

                setPagesWithChanges(results);
            } catch (error) {
                console.error('Error detecting changes:', error);
            } finally {
                setIsLoading(false);
                isInitialLoadRef.current = false;
                hasEverRunRef.current = true;
            }
        };

        detectChanges();
    }, [token, stablePageIds, refreshKey, enabled]);

    return {
        pagesWithChanges,
        globalsHasChanges,
        isLoading,
        refresh
    };
}

