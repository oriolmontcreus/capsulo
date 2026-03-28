import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getChangedPageIds, getPageDraft, getGlobalsDraft } from '@/lib/cms-local-changes';

import type { ChangeItem } from './types';
import { fileNameToPageId, fetchRemotePageData } from './utils';
import { hasVisibleContentDiff } from './DiffView';

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

                // List only pages whose draft differs from remote in the same way DiffView decides
                for (const pageId of changedPageIds) {
                    if (pageId === 'globals') continue;

                    const normalizedPageId = fileNameToPageId(pageId);
                    const pageInfo = availablePages.find(p => p.id === pageId)
                        || availablePages.find(p => p.id === normalizedPageId);
                    const pageName = pageInfo?.name || (pageId === 'index' ? 'Home' : pageId);
                    const displayId = pageInfo?.id || normalizedPageId;

                    let draft = await getPageDraft(pageId);
                    if (!draft) {
                        draft = await getPageDraft(normalizedPageId);
                    }
                    if (!draft) {
                        continue;
                    }

                    try {
                        const remote = await fetchRemotePageData(displayId, token);
                        if (remote && !hasVisibleContentDiff(remote, draft)) {
                            continue;
                        }
                    } catch {
                        // If remote cannot be loaded, keep the item so real WIP is not hidden offline
                    }

                    results.push({ id: displayId, name: pageName });
                }

                let globalsHasVisibleDiff = false;
                const globalsDraftData = await getGlobalsDraft();
                if (globalsDraftData) {
                    const localAsPage = { components: globalsDraftData.variables };
                    try {
                        const remoteGlobals = await fetchRemotePageData('globals', token);
                        globalsHasVisibleDiff =
                            !remoteGlobals || hasVisibleContentDiff(remoteGlobals, localAsPage);
                    } catch {
                        globalsHasVisibleDiff = true;
                    }
                }

                setGlobalsHasChanges(globalsHasVisibleDiff);

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

