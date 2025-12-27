import type { PageData } from '@/lib/form-builder';

/**
 * Normalizes "empty-ish" values for comparison.
 * Treats null, undefined, and empty string as equivalent (undefined).
 * For objects, recursively normalizes and checks if effectively empty.
 */
export const normalizeForComparison = (value: any): any => {
    if (value === null || value === undefined || value === '') return undefined;
    if (Array.isArray(value) && value.length === 0) return undefined;
    if (typeof value === 'object' && !Array.isArray(value)) {
        const keys = Object.keys(value);
        if (keys.length === 0) return undefined;
    }
    return value;
};

/**
 * Converts a page ID to the corresponding file name.
 * Maps "home" to "index" for file system compatibility.
 */
export const pageIdToFileName = (pageId: string): string => {
    return pageId === 'home' ? 'index' : pageId;
};

/**
 * Converts a file name to the corresponding page ID.
 * Maps "index" to "home" for UI consistency.
 */
export const fileNameToPageId = (fileName: string): string => {
    return fileName === 'index' ? 'home' : fileName;
};

/**
 * Fetches remote page data from GitHub, trying draft branch first, then main.
 * @param pageId - The page ID (e.g., "home", "about", "globals")
 * @param token - GitHub authentication token
 * @param signal - Optional AbortSignal for cancellation
 * @returns PageData or null if not found
 */
export const fetchRemotePageData = async (
    pageId: string,
    token: string,
    signal?: AbortSignal
): Promise<PageData | null> => {
    const fileName = pageIdToFileName(pageId);

    // Try draft branch first
    let response = await fetch(`/api/cms/changes?page=${encodeURIComponent(fileName)}&branch=draft`, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal
    });

    let result = await response.json();

    // If draft doesn't exist, try main branch
    if (!response.ok || (result.data === null && result.message?.includes('does not exist'))) {
        response = await fetch(`/api/cms/changes?page=${encodeURIComponent(fileName)}&branch=main`, {
            headers: { 'Authorization': `Bearer ${token}` },
            signal
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch remote data');
        }

        result = await response.json();
    }

    const data = result.data;
    if (!data) return null;

    // Convert GlobalData to PageData if needed
    return convertToPageData(data);
};

/**
 * Converts GlobalData or PageData to PageData format.
 * Handles the "variables" vs "components" field difference.
 */
export const convertToPageData = (data: any): PageData => {
    if ('variables' in data) {
        return { components: data.variables };
    }
    return data;
};
