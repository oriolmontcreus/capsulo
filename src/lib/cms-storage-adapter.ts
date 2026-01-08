import type { PageData, GlobalData } from './form-builder';
import {
    savePageToGitHub,
    publishChanges as publishToGitHub,
    hasDraftChanges as hasGitHubDraft,
    loadDraftData as loadGitHubDraft,
    getCurrentDraftBranch,
    saveGlobalsToGitHub,
    loadGlobalsFromGitHub,
    batchCommitChanges,
} from './cms-storage';
import { getStoredAccessToken } from './auth';
import {
    isDevelopmentMode,
    savePageLocally,
    loadPageLocally,
    hasLocalChanges,
    saveGlobalsLocally,
    loadGlobalsLocally,
} from './cms-storage-local';

/**
 * Unified storage adapter that automatically switches between
 * local file storage (dev mode) and GitHub API storage (production mode)
 */

/**
 * Save page data to the appropriate storage backend
 * @param commitMessage Optional commit message for GitHub saves
 */
export const savePage = async (pageName: string, data: PageData, commitMessage?: string): Promise<void> => {
    // Map page names to file names (e.g., 'home' -> 'index')
    const fileName = pageName === 'home' ? 'index' : pageName;

    if (isDevelopmentMode()) {
        return savePageLocally(fileName, data, commitMessage);
    } else {
        await savePageToGitHub(fileName, data, undefined, commitMessage);
    }
};
/**
 * Load draft/unpublished changes
 */
export const loadDraft = async (pageName: string): Promise<PageData | null> => {
    // Map page names to file names (e.g., 'home' -> 'index')
    const fileName = pageName === 'home' ? 'index' : pageName;

    if (isDevelopmentMode()) {
        // In dev mode, there's no draft concept - just load the file
        return loadPageLocally(fileName);
    } else {
        return loadGitHubDraft(fileName);
    }
};

/**
 * Check if there are any unpublished changes
 */
export const hasUnpublishedChanges = async (): Promise<boolean> => {
    if (isDevelopmentMode()) {
        // In dev mode, changes are always "published" (saved locally)
        return hasLocalChanges();
    } else {
        return hasGitHubDraft();
    }
};

/**
 * Publish changes (only relevant in production mode)
 */
export const publish = async (): Promise<void> => {
    if (isDevelopmentMode()) {
        return;
    } else {
        return publishToGitHub();
    }
};

/**
 * Get current draft branch name (only relevant in production mode)
 */
export const getDraftBranch = async (): Promise<string | null> => {
    if (isDevelopmentMode()) {
        return null;
    } else {
        return getCurrentDraftBranch();
    }
};

/**
 * Save global variables data to the appropriate storage backend
 * @param commitMessage Optional commit message for GitHub saves
 */
export const saveGlobals = async (data: GlobalData, commitMessage?: string): Promise<void> => {
    if (isDevelopmentMode()) {
        return saveGlobalsLocally(data, commitMessage);
    } else {
        await saveGlobalsToGitHub(data, undefined, commitMessage);
    }
};

/**
 * Batch save multiple pages and optionally globals in a single commit.
 * Both dev mode and production mode use atomic batch commit via the appropriate mechanism.
 */
export const batchSaveChanges = async (
    changes: {
        pages: Array<{ pageName: string; data: PageData }>;
        globals?: GlobalData;
    },
    commitMessage: string
): Promise<void> => {
    if (isDevelopmentMode()) {
        // Get GitHub token for GitHub sync
        const githubToken = getStoredAccessToken();

        // Use the batch-save API endpoint which handles local saves + GitHub sync atomically
        const response = await fetch('/api/cms/batch-save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                pages: changes.pages,
                globals: changes.globals,
                commitMessage,
                githubToken,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to batch save');
        }
    } else {
        // In production, use atomic batch commit directly
        await batchCommitChanges(changes, commitMessage);
    }
};

/**
 * Load global variables data from the appropriate storage backend
 */
export const loadGlobals = async (): Promise<GlobalData | null> => {
    if (isDevelopmentMode()) {
        return loadGlobalsLocally();
    } else {
        return loadGlobalsFromGitHub();
    }
};

/**
 * Export mode detection for components to use
 */
export { isDevelopmentMode };
