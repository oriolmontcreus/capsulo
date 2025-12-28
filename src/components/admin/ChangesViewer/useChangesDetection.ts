import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getChangedPageIds, getPageDraft, getGlobalsDraft, hasGlobalsDraft } from '@/lib/cms-local-changes';
import type { PageData } from '@/lib/form-builder';

import type { ChangeItem } from './types';
import { normalizeForComparison, fetchRemotePageData, fileNameToPageId, convertToPageData } from './utils';

interface UseChangesDetectionResult {
    pagesWithChanges: ChangeItem[];
    globalsHasChanges: boolean;
    isLoading: boolean;
    refresh: () => void;
}



// Deep comparison of two data objects
const hasActualChanges = (localData: PageData | null, remoteData: PageData | null): boolean => {
    if (!localData && !remoteData) return false;
    if (!localData || !remoteData) return true;

    const localComponents = localData.components || [];
    const remoteComponents = remoteData.components || [];

    // Different number of components = changes
    if (localComponents.length !== remoteComponents.length) return true;

    // Compare each component
    for (let i = 0; i < localComponents.length; i++) {
        const local = localComponents[i];
        const remote = remoteComponents.find(c => c.id === local.id);

        if (!remote) return true; // Component not found in remote
        if (local.schemaName !== remote.schemaName) return true;

        // Compare data fields
        const localComponentData = local.data || {};
        const remoteComponentData = remote.data || {};

        const allKeys = new Set([...Object.keys(localComponentData), ...Object.keys(remoteComponentData)]);

        for (const key of allKeys) {
            const localVal = normalizeForComparison(localComponentData[key]?.value);
            const remoteVal = normalizeForComparison(remoteComponentData[key]?.value);

            // Both undefined = no change for this field
            if (localVal === undefined && remoteVal === undefined) continue;

            if (JSON.stringify(localVal) !== JSON.stringify(remoteVal)) {
                return true;
            }
        }
    }

    return false;
};

export function useChangesDetection(
    availablePages: Array<{ id: string; name: string }>,
    token: string | null
): UseChangesDetectionResult {
    const [pagesWithChanges, setPagesWithChanges] = useState<ChangeItem[]>([]);
    const [globalsHasChanges, setGlobalsHasChanges] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const isInitialLoadRef = useRef(true);

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
                const changedPageIds = getChangedPageIds();
                const results: ChangeItem[] = [];

                // Check each page that has a localStorage draft
                for (const pageId of changedPageIds) {
                    const localDraft = getPageDraft(pageId);
                    if (!localDraft) continue;

                    // Handle the index <-> home ID mapping
                    const normalizedPageId = fileNameToPageId(pageId);

                    // Try to find page by both the original ID and normalized ID
                    const pageInfo = availablePages.find(p => p.id === pageId)
                        || availablePages.find(p => p.id === normalizedPageId);
                    const pageName = pageInfo?.name || (pageId === 'index' ? 'Home' : pageId);
                    // Use the ID from availablePages if found, otherwise use normalized ID
                    const displayId = pageInfo?.id || normalizedPageId;

                    try {
                        const remoteData = await fetchRemotePageData(pageId, token);
                        const actuallyHasChanges = hasActualChanges(localDraft, remoteData);

                        if (actuallyHasChanges) {
                            results.push({
                                id: displayId,
                                name: pageName
                            });
                        }
                    } catch (error) {
                        console.error(`Error checking changes for ${pageId}:`, error);
                        // On error, assume there are changes to be safe
                        results.push({
                            id: displayId,
                            name: pageName
                        });
                    }
                }

                // Check globals
                if (hasGlobalsDraft()) {
                    const globalsDraft = getGlobalsDraft();
                    if (globalsDraft) {
                        try {
                            const remoteGlobals = await fetchRemotePageData('globals', token);
                            // Convert to PageData format for comparison
                            const localAsPageData: PageData = { components: globalsDraft.variables };
                            const remoteAsPageData: PageData = convertToPageData(remoteGlobals || { variables: [] });

                            setGlobalsHasChanges(hasActualChanges(localAsPageData, remoteAsPageData));
                        } catch (error) {
                            console.error('Error checking globals changes:', error);
                            setGlobalsHasChanges(true); // Assume changes on error
                        }
                    }
                } else {
                    setGlobalsHasChanges(false);
                }

                setPagesWithChanges(results);
            } catch (error) {
                console.error('Error detecting changes:', error);
            } finally {
                setIsLoading(false);
                isInitialLoadRef.current = false;
            }
        };

        detectChanges();
    }, [token, availablePages, refreshKey]);

    return {
        pagesWithChanges,
        globalsHasChanges,
        isLoading,
        refresh
    };
}
