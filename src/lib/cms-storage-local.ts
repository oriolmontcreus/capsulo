import type { PageData, GlobalData } from './form-builder';
import { getStoredAccessToken } from './auth';

/**
 * Detects if we're running in development mode
 */
export const isDevelopmentMode = (): boolean => {
    return import.meta.env.DEV || import.meta.env.MODE === 'development';
};

/**
 * Save page data locally (for development mode)
 * This makes a POST request to an API endpoint that writes to the file system
 * Also syncs to GitHub draft branch if a token is available
 */
export const savePageLocally = async (pageName: string, data: PageData, commitMessage?: string): Promise<void> => {
    try {
        // Get GitHub token for optional draft branch sync
        const githubToken = getStoredAccessToken();

        const response = await fetch('/api/cms/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                pageName,
                data,
                githubToken, // Pass token for optional GitHub sync
                commitMessage,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to save page data');
        }
    } catch (error) {
        throw error;
    }
};

/**
 * Load page data locally (for development mode)
 * This makes a GET request to an API endpoint that reads from the file system
 */
export const loadPageLocally = async (pageName: string): Promise<PageData | null> => {
    if (!pageName || pageName === 'undefined') return null;
    try {
        const response = await fetch(`/api/cms/load?page=${pageName}`);

        if (!response.ok) {
            if (response.status === 404) {
                return null;
            }
            throw new Error('Failed to load page data');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        return null;
    }
};

/**
 * Check if there are unpublished changes locally.
 * 
 * In development mode, this always returns `false` because:
 * - Changes are immediately written to the file system (no draft branch)
 * - There's no "publish" step — local saves ARE the published state
 * - The Astro dev server picks up changes instantly via HMR
 * 
 * This is intentional and semantically correct for the dev workflow. THIS MIGHT CHANGE IN THE FUTURE THO.
 */
export const hasLocalChanges = async (): Promise<boolean> => {
    return false;
};

/**
 * Save global variables data locally (for development mode)
 * This makes a POST request to an API endpoint that writes to the file system
 * Also syncs to GitHub draft branch if a token is available
 */
export const saveGlobalsLocally = async (data: GlobalData, commitMessage?: string): Promise<void> => {
    try {
        // Get GitHub token for optional draft branch sync
        const githubToken = getStoredAccessToken();

        const response = await fetch('/api/cms/globals/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                data,
                githubToken, // Pass token for optional GitHub sync
                commitMessage,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to save global variables data');
        }
    } catch (error) {
        throw error;
    }
};

/**
 * Load global variables data locally (for development mode)
 * This makes a GET request to an API endpoint that reads from the file system
 */
export const loadGlobalsLocally = async (): Promise<GlobalData | null> => {
    try {
        const response = await fetch('/api/cms/globals/load');

        if (!response.ok) {
            if (response.status === 404) {
                return null;
            }
            throw new Error('Failed to load global variables data');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        return null;
    }
};
