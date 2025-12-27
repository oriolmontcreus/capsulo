import { useState, useEffect, useMemo, useCallback } from 'react';
import { getChangedPageIds, getPageDraft, getGlobalsDraft, hasGlobalsDraft } from '@/lib/cms-local-changes';
import type { PageData } from '@/lib/form-builder';

import type { ChangeItem } from './types';

interface UseChangesDetectionResult {
    pagesWithChanges: ChangeItem[];
    globalsHasChanges: boolean;
    isLoading: boolean;
    refresh: () => void;
}

// Helper to normalize values for comparison (same logic as DiffView)
const normalizeForComparison = (value: any): any => {
    if (value === null || value === undefined || value === '') return undefined;
    if (typeof value === 'object' && !Array.isArray(value)) {
        const keys = Object.keys(value);
        if (keys.length === 0) return undefined;
    }
    return value;
};

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
        const localData = local.data || {};
        const remoteData = remote.data || {};

        const allKeys = new Set([...Object.keys(localData), ...Object.keys(remoteData)]);

        for (const key of allKeys) {
            const localVal = normalizeForComparison(localData[key]?.value);
            const remoteVal = normalizeForComparison(remoteData[key]?.value);

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

    const refresh = useCallback(() => {
        setRefreshKey(prev => prev + 1);
    }, []);

    useEffect(() => {
        if (!token) {
            setIsLoading(false);
            return;
        }

        const detectChanges = async () => {
            setIsLoading(true);

            try {
                const changedPageIds = getChangedPageIds();
                const results: ChangeItem[] = [];

                // Check each page that has a localStorage draft
                for (const pageId of changedPageIds) {
                    const localDraft = getPageDraft(pageId);
                    if (!localDraft) continue;

                    // Handle the index <-> home ID mapping
                    // localStorage might use "index" but availablePages might use "home"
                    const normalizedPageId = pageId === 'index' ? 'home' : pageId;
                    const fileName = pageId === 'home' ? 'index' : pageId;

                    // Try to find page by both the original ID and normalized ID
                    const pageInfo = availablePages.find(p => p.id === pageId)
                        || availablePages.find(p => p.id === normalizedPageId);
                    const pageName = pageInfo?.name || (pageId === 'index' ? 'Home' : pageId);
                    // Use the ID from availablePages if found, otherwise use normalized ID
                    const displayId = pageInfo?.id || normalizedPageId;

                    try {
                        // Fetch remote data from draft branch, fallback to main
                        let response = await fetch(`/api/cms/changes?page=${encodeURIComponent(fileName)}&branch=draft`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });

                        let result = await response.json();

                        // If draft doesn't exist, try main branch
                        if (!response.ok || (result.data === null && result.message?.includes('does not exist'))) {
                            response = await fetch(`/api/cms/changes?page=${encodeURIComponent(fileName)}&branch=main`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            result = await response.json();
                        }

                        const remoteData = result.data || { components: [] };
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
                            let response = await fetch(`/api/cms/changes?page=globals&branch=draft`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });

                            let result = await response.json();

                            if (!response.ok || (result.data === null && result.message?.includes('does not exist'))) {
                                response = await fetch(`/api/cms/changes?page=globals&branch=main`, {
                                    headers: { 'Authorization': `Bearer ${token}` }
                                });
                                result = await response.json();
                            }

                            const remoteGlobals = result.data || { variables: [] };
                            // Convert to PageData format for comparison
                            const localAsPageData: PageData = { components: globalsDraft.variables };
                            const remoteAsPageData: PageData = {
                                components: 'variables' in remoteGlobals ? remoteGlobals.variables : (remoteGlobals.components || [])
                            };

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
