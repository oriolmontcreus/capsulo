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

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to save page data');
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
 * Check if there are unsaved changes locally
 * In dev mode, there are no draft branches, so this always returns false
 */
export const hasLocalChanges = async (): Promise<boolean> => {
    return false;
};
