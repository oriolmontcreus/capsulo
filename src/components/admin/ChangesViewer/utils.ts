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
 * Helper function to fetch and parse data from a specific branch.
 * @param fileName - The file name to fetch
 * @param branch - The branch to fetch from
 * @param token - GitHub authentication token
 * @param signal - Optional AbortSignal for cancellation
 * @returns Object containing success status, parsed data, and whether draft is missing
 */
const tryFetchFromBranch = async (
    fileName: string,
    branch: string,
    token: string,
    signal?: AbortSignal
): Promise<{ ok: boolean; data: any; isDraftMissing?: boolean }> => {
    const response = await fetch(`/api/cms/changes?page=${encodeURIComponent(fileName)}&branch=${branch}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal
    });

    const result = await response.json();
    const isDraftMissing = result.data === null && result.message?.includes('does not exist');

    return { ok: response.ok, data: result.data, isDraftMissing };
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
    const draftResult = await tryFetchFromBranch(fileName, 'draft', token, signal);

    // If draft doesn't exist or failed, try main branch
    if (!draftResult.ok || draftResult.isDraftMissing) {
        const mainResult = await tryFetchFromBranch(fileName, 'main', token, signal);

        if (!mainResult.ok) {
            throw new Error('Failed to fetch remote data');
        }

        const data = mainResult.data;
        if (!data) return null;

        return convertToPageData(data);
    }

    const data = draftResult.data;
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
