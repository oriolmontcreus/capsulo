/**
 * API Client for CMS data fetching
 * 
 * Typed fetch functions with smart caching support.
 * Uses IndexedDB cache for fast loads with commit SHA-based invalidation.
 */

import type { PageInfo } from '@/lib/admin/types';
import type { PageData, GlobalData } from '@/lib/form-builder';
import { getStoredAccessToken } from '@/lib/auth';
import {
    getCachedCommitSha,
    setCachedCommitSha,
    isCacheValid,
    getCachedPageData,
    setCachedPageData,
    getCachedPagesList,
    setCachedPagesList,
    getCachedGlobals,
    setCachedGlobals,
    invalidateCache
} from '@/lib/cms-cache';

const API_BASE = '/api/cms';

/**
 * Create headers with authorization
 */
function createAuthHeaders(): HeadersInit {
    const token = getStoredAccessToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

/**
 * Fetches the latest commit SHA from the main branch.
 * Used to check if cached data is stale.
 */
export async function fetchLatestCommitSha(): Promise<string | null> {
    const token = getStoredAccessToken();
    if (!token) return null;

    try {
        const response = await fetch(`${API_BASE}/commit-sha`, {
            headers: createAuthHeaders()
        });

        if (!response.ok) {
            console.warn('Failed to fetch commit SHA:', response.statusText);
            return null;
        }

        const data = await response.json();
        return data.sha || null;
    } catch (error) {
        console.warn('Error fetching commit SHA:', error);
        return null;
    }
}

/**
 * Checks cache validity and updates if needed.
 * Returns true if cache is valid, false if it needs refresh.
 */
export async function checkAndUpdateCache(): Promise<{ isValid: boolean; commitSha: string | null }> {
    const latestSha = await fetchLatestCommitSha();

    if (!latestSha) {
        // Can't verify - assume cache is valid if we have one
        const cachedSha = await getCachedCommitSha();
        return { isValid: !!cachedSha, commitSha: cachedSha };
    }

    const cachedSha = await getCachedCommitSha();
    const isValid = cachedSha === latestSha && await isCacheValid(latestSha);

    if (!isValid && cachedSha !== latestSha) {
        // Commit SHA changed - cache is stale
        await invalidateCache();
        await setCachedCommitSha(latestSha);
    }

    return { isValid, commitSha: latestSha };
}

/**
 * Fetches list of available pages with caching
 */
export async function fetchPages(): Promise<PageInfo[]> {
    // Check cache first
    const { isValid, commitSha } = await checkAndUpdateCache();

    if (isValid) {
        const cached = await getCachedPagesList();
        if (cached) {
            return cached;
        }
    }

    // Fetch from API
    const response = await fetch(`${API_BASE}/pages`);

    if (!response.ok) {
        throw new Error(`Failed to fetch pages: ${response.statusText}`);
    }

    const data = await response.json();
    const pages = data.pages as PageInfo[];

    // Update cache
    if (commitSha) {
        await setCachedPagesList(pages, commitSha);
    }

    return pages;
}

/**
 * Fetches data for a specific page with caching
 */
export async function fetchPageData(pageId: string): Promise<PageData> {
    // Map 'home' to 'index' for API consistency
    const fileName = pageId === 'home' ? 'index' : pageId;

    // Check cache first
    const { isValid, commitSha } = await checkAndUpdateCache();

    if (isValid) {
        const cached = await getCachedPageData(fileName);
        if (cached) {
            return cached;
        }
    }

    // Fetch from API
    const response = await fetch(`${API_BASE}/load?page=${encodeURIComponent(fileName)}`);

    if (!response.ok) {
        if (response.status === 404) {
            // Return empty page data if not found
            return { components: [] };
        }
        throw new Error(`Failed to fetch page data: ${response.statusText}`);
    }

    const data = await response.json() as PageData;

    // Update cache
    if (commitSha) {
        await setCachedPageData(fileName, data, commitSha);
    }

    return data;
}

/**
 * Fetches global variables data with caching
 */
export async function fetchGlobalData(): Promise<GlobalData> {
    // Check cache first
    const { isValid, commitSha } = await checkAndUpdateCache();

    if (isValid) {
        const cached = await getCachedGlobals();
        if (cached) {
            return cached;
        }
    }

    // Fetch from API
    const response = await fetch(`${API_BASE}/globals/load`);

    if (!response.ok) {
        if (response.status === 404) {
            // Return empty globals if not found
            return { variables: [] };
        }
        throw new Error(`Failed to fetch global data: ${response.statusText}`);
    }

    const data = await response.json() as GlobalData;

    // Update cache
    if (commitSha) {
        await setCachedGlobals(data, commitSha);
    }

    return data;
}

/**
 * Force refresh the cache by invalidating and refetching commit SHA
 */
export async function refreshCache(): Promise<void> {
    await invalidateCache();
    const sha = await fetchLatestCommitSha();
    if (sha) {
        await setCachedCommitSha(sha);
    }
}
