import type { PageData } from './form-builder';

/**
 * Detects if we're running in development mode
 */
export const isDevelopmentMode = (): boolean => {
    return import.meta.env.DEV || import.meta.env.MODE === 'development';
};

/**
 * Save page data locally (for development mode)
 * This makes a POST request to an API endpoint that writes to the file system
 */
export const savePageLocally = async (pageName: string, data: PageData): Promise<void> => {
    try {
        console.log(`[Local Storage] Attempting to save page: ${pageName}`, data);

        const response = await fetch('/api/cms/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                pageName,
                data,
            }),
        });

        console.log(`[Local Storage] Response status: ${response.status}`);

        if (!response.ok) {
            const error = await response.json();
            console.error('[Local Storage] Save failed with error:', error);
            throw new Error(error.message || 'Failed to save page data');
        }

        const result = await response.json();
        console.log(`[Local Storage] Successfully saved page: ${pageName}`, result);
    } catch (error) {
        console.error('[Local Storage] Failed to save:', error);
        throw error;
    }
};

/**
 * Load page data locally (for development mode)
 * This makes a GET request to an API endpoint that reads from the file system
 */
export const loadPageLocally = async (pageName: string): Promise<PageData | null> => {
    try {
        const response = await fetch(`/api/cms/load?page=${pageName}`);

        if (!response.ok) {
            if (response.status === 404) {
                console.warn(`[Local Storage] Page not found: ${pageName}`);
                return null;
            }
            throw new Error('Failed to load page data');
        }

        const data = await response.json();
        console.log(`[Local Storage] Loaded page: ${pageName}`);
        return data;
    } catch (error) {
        console.error('[Local Storage] Failed to load:', error);
        return null;
    }
};

/**
 * Check if there are unsaved changes locally
 * In dev mode, there are no draft branches, so this always returns false
 */
export const hasLocalChanges = async (): Promise<boolean> => {
    return false;
};
