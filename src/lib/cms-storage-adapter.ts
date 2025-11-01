import type { PageData } from './form-builder';
import {
    savePageToGitHub,
    publishChanges as publishToGitHub,
    hasDraftChanges as hasGitHubDraft,
    loadDraftData as loadGitHubDraft,
    getCurrentDraftBranch,
} from './cms-storage';
import {
    isDevelopmentMode,
    savePageLocally,
    loadPageLocally,
    hasLocalChanges,
} from './cms-storage-local';

/**
 * Unified storage adapter that automatically switches between
 * local file storage (dev mode) and GitHub API storage (production mode)
 */

/**
 * Save page data to the appropriate storage backend
 */
export const savePage = async (pageName: string, data: PageData): Promise<void> => {
    // Map page names to file names (e.g., 'home' -> 'index')
    const fileName = pageName === 'home' ? 'index' : pageName;

    if (isDevelopmentMode()) {
        return savePageLocally(fileName, data);
    } else {
        return savePageToGitHub(fileName, data);
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
 * Export mode detection for components to use
 */
export { isDevelopmentMode };
