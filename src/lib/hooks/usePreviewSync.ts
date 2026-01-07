/**
 * usePreviewSync Hook
 * 
 * Provides functions to sync draft data to the Vite dev server's in-memory store.
 * This enables live preview without disk writes.
 * 
 * DEV ONLY: These functions only work when running the dev server.
 */

import { useCallback, useRef, useState } from 'react';
import { getPageDraft, getGlobalsDraft } from '@/lib/idb-storage';
import type { PageData, GlobalData } from '@/lib/form-builder';

interface PreviewSyncResult {
    /** Sync a specific page to preview */
    syncPageToPreview: (pageId: string) => Promise<boolean>;
    /** Sync globals to preview */
    syncGlobalsToPreview: () => Promise<boolean>;
    /** Sync both current page and globals to preview */
    syncAllToPreview: (pageId: string) => Promise<boolean>;
    /** Clear preview data and revert to committed content */
    clearPreview: () => Promise<void>;
    /** Check if preview is currently active */
    isPreviewActive: boolean;
    /** Last sync timestamp */
    lastSyncTime: number | null;
    /** Whether a sync is in progress */
    isSyncing: boolean;
}

export function usePreviewSync(): PreviewSyncResult {
    const [isPreviewActive, setIsPreviewActive] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const previewWindowRef = useRef<Window | null>(null);

    const syncPageToPreview = useCallback(async (pageId: string): Promise<boolean> => {
        try {
            setIsSyncing(true);

            // Get draft from IndexedDB
            const draft = await getPageDraft(pageId);
            if (!draft) {
                console.warn(`[usePreviewSync] No draft found for page: ${pageId}`);
                return false;
            }

            // Send to preview server
            const response = await fetch('/__capsulo_preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'page',
                    pageId,
                    data: draft
                })
            });

            if (!response.ok) {
                console.error(`[usePreviewSync] Failed to sync page: ${response.status}`);
                return false;
            }

            console.log(`[usePreviewSync] Successfully synced page: ${pageId}`);
            setIsPreviewActive(true);
            setLastSyncTime(Date.now());
            return true;
        } catch (error) {
            console.error('[usePreviewSync] Error syncing page:', error);
            return false;
        } finally {
            setIsSyncing(false);
        }
    }, []);

    const syncGlobalsToPreview = useCallback(async (): Promise<boolean> => {
        try {
            setIsSyncing(true);

            // Get globals draft from IndexedDB
            const draft = await getGlobalsDraft();
            if (!draft) {
                console.warn('[usePreviewSync] No globals draft found');
                return false;
            }

            // Send to preview server
            const response = await fetch('/__capsulo_preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'globals',
                    data: draft
                })
            });

            if (!response.ok) {
                console.error(`[usePreviewSync] Failed to sync globals: ${response.status}`);
                return false;
            }

            setIsPreviewActive(true);
            setLastSyncTime(Date.now());
            return true;
        } catch (error) {
            console.error('[usePreviewSync] Error syncing globals:', error);
            return false;
        } finally {
            setIsSyncing(false);
        }
    }, []);

    const syncAllToPreview = useCallback(async (pageId: string): Promise<boolean> => {
        try {
            setIsSyncing(true);

            // Sync page
            const pageDraft = await getPageDraft(pageId);
            if (pageDraft) {
                await fetch('/__capsulo_preview', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'page',
                        pageId,
                        data: pageDraft
                    })
                });
            }

            // Sync globals if they exist
            const globalsDraft = await getGlobalsDraft();
            if (globalsDraft) {
                await fetch('/__capsulo_preview', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'globals',
                        data: globalsDraft
                    })
                });
            }

            setIsPreviewActive(true);
            setLastSyncTime(Date.now());

            // Open or refresh preview window
            if (previewWindowRef.current && !previewWindowRef.current.closed) {
                previewWindowRef.current.location.reload();
            } else {
                // Determine preview URL based on pageId
                const previewPath = pageId === 'index' ? '/' : `/${pageId.replace(/-/g, '/')}`;
                previewWindowRef.current = window.open(previewPath, 'capsulo-preview');
            }

            return true;
        } catch (error) {
            console.error('[usePreviewSync] Error syncing all:', error);
            return false;
        } finally {
            setIsSyncing(false);
        }
    }, []);

    const clearPreview = useCallback(async (): Promise<void> => {
        try {
            await fetch('/__capsulo_preview', {
                method: 'DELETE'
            });
            setIsPreviewActive(false);
            setLastSyncTime(null);

            // Refresh preview window to show committed content
            if (previewWindowRef.current && !previewWindowRef.current.closed) {
                previewWindowRef.current.location.reload();
            }
        } catch (error) {
            console.error('[usePreviewSync] Error clearing preview:', error);
        }
    }, []);

    return {
        syncPageToPreview,
        syncGlobalsToPreview,
        syncAllToPreview,
        clearPreview,
        isPreviewActive,
        lastSyncTime,
        isSyncing
    };
}
