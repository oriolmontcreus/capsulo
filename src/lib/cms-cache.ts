/**
 * CMS Cache Module
 * 
 * Provides localStorage-based caching for CMS page and globals data with commit SHA tracking.
 * This enables smart cache invalidation - only fetch data when the remote commit has changed.
 * 
 * Unlike draft storage (sessionStorage), this cache persists across browser sessions
 * to provide fast initial loads.
 */

import type { PageData, GlobalData } from './form-builder';
import type { PageInfo } from './admin/types';

// Cache storage keys
const CACHE_PREFIX = 'cms_cache_';
const PAGES_CACHE_PREFIX = `${CACHE_PREFIX}page_`;
const PAGES_LIST_KEY = `${CACHE_PREFIX}pages_list`;
const GLOBALS_KEY = `${CACHE_PREFIX}globals`;
const COMMIT_SHA_KEY = `${CACHE_PREFIX}commit_sha`;
const CACHE_TIMESTAMP_KEY = `${CACHE_PREFIX}timestamp`;

// Cache expiry time - 24 hours (in ms)
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface CacheEntry<T> {
    data: T;
    commitSha: string;
    timestamp: number;
}

/**
 * Check if we're in a browser environment
 */
function isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/**
 * Get the stored commit SHA from cache
 */
export function getCachedCommitSha(): string | null {
    if (!isBrowser()) return null;

    try {
        return localStorage.getItem(COMMIT_SHA_KEY);
    } catch {
        return null;
    }
}

/**
 * Set the latest commit SHA in cache
 * @returns true if successfully cached, false if storage failed (e.g., quota exceeded)
 */
export function setCachedCommitSha(sha: string): boolean {
    if (!isBrowser()) return false;

    try {
        localStorage.setItem(COMMIT_SHA_KEY, sha);
        localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
        return true;
    } catch (error) {
        console.error('Failed to set cached commit SHA:', error);
        return false;
    }
}

/**
 * Check if the cache is valid (not expired and matches current commit SHA)
 */
export function isCacheValid(currentCommitSha: string): boolean {
    if (!isBrowser()) return false;

    try {
        const cachedSha = getCachedCommitSha();
        if (!cachedSha || cachedSha !== currentCommitSha) {
            return false;
        }

        // Also check timestamp to handle very old cache
        const timestampStr = localStorage.getItem(CACHE_TIMESTAMP_KEY);
        if (!timestampStr) return false;

        const timestamp = parseInt(timestampStr, 10);
        const age = Date.now() - timestamp;

        return age < CACHE_MAX_AGE_MS;
    } catch {
        return false;
    }
}

/**
 * Get cached page data
 */
export function getCachedPageData(pageId: string): PageData | null {
    if (!isBrowser()) return null;

    try {
        const raw = localStorage.getItem(`${PAGES_CACHE_PREFIX}${pageId}`);
        if (!raw) return null;

        const entry: CacheEntry<PageData> = JSON.parse(raw);
        return entry.data;
    } catch {
        return null;
    }
}

/**
 * Set cached page data
 * @returns true if successfully cached, false if storage failed (e.g., quota exceeded)
 */
export function setCachedPageData(pageId: string, data: PageData, commitSha: string): boolean {
    if (!isBrowser()) return false;

    try {
        const entry: CacheEntry<PageData> = {
            data,
            commitSha,
            timestamp: Date.now()
        };
        localStorage.setItem(`${PAGES_CACHE_PREFIX}${pageId}`, JSON.stringify(entry));
        return true;
    } catch (error) {
        console.error('Failed to cache page data:', error);
        return false;
    }
}

/**
 * Get cached pages list
 */
export function getCachedPagesList(): PageInfo[] | null {
    if (!isBrowser()) return null;

    try {
        const raw = localStorage.getItem(PAGES_LIST_KEY);
        if (!raw) return null;

        const entry = JSON.parse(raw);

        // Detailed structural validation to prevent errors from corrupted cache
        if (!entry || typeof entry !== 'object' || !Array.isArray(entry.data)) {
            return null;
        }

        // Validate that each element conforms to PageInfo
        const isValid = (entry.data as any[]).every(item =>
            item &&
            typeof item === 'object' &&
            typeof item.id === 'string' &&
            typeof item.name === 'string' &&
            typeof item.path === 'string'
        );

        if (!isValid) return null;

        return entry.data as PageInfo[];
    } catch {
        return null;
    }
}

/**
 * Set cached pages list
 * @returns true if successfully cached, false if storage failed (e.g., quota exceeded)
 */
export function setCachedPagesList(pages: PageInfo[], commitSha: string): boolean {
    if (!isBrowser()) return false;

    try {
        const entry: CacheEntry<PageInfo[]> = {
            data: pages,
            commitSha,
            timestamp: Date.now()
        };
        localStorage.setItem(PAGES_LIST_KEY, JSON.stringify(entry));
        return true;
    } catch (error) {
        console.error('Failed to cache pages list:', error);
        return false;
    }
}

/**
 * Get cached globals data
 */
export function getCachedGlobals(): GlobalData | null {
    if (!isBrowser()) return null;

    try {
        const raw = localStorage.getItem(GLOBALS_KEY);
        if (!raw) return null;

        const entry: CacheEntry<GlobalData> = JSON.parse(raw);
        return entry.data;
    } catch {
        return null;
    }
}

/**
 * Set cached globals data
 * @returns true if successfully cached, false if storage failed (e.g., quota exceeded)
 */
export function setCachedGlobals(data: GlobalData, commitSha: string): boolean {
    if (!isBrowser()) return false;

    try {
        const entry: CacheEntry<GlobalData> = {
            data,
            commitSha,
            timestamp: Date.now()
        };
        localStorage.setItem(GLOBALS_KEY, JSON.stringify(entry));
        return true;
    } catch (error) {
        console.error('Failed to cache globals:', error);
        return false;
    }
}

/**
 * Invalidate all cached data (when commit SHA changes)
 */
export function invalidateCache(): void {
    if (!isBrowser()) return;

    try {
        // Get all keys and remove cache entries
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(CACHE_PREFIX)) {
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
        console.error('Failed to invalidate cache:', error);
    }
}

/**
 * Get list of cached page IDs
 */
export function getCachedPageIds(): string[] {
    if (!isBrowser()) return [];

    try {
        const pageIds: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(PAGES_CACHE_PREFIX)) {
                const pageId = key.substring(PAGES_CACHE_PREFIX.length);
                pageIds.push(pageId);
            }
        }
        return pageIds;
    } catch {
        return [];
    }
}

/**
 * Remove a specific page from cache
 */
export function removeCachedPage(pageId: string): void {
    if (!isBrowser()) return;

    try {
        localStorage.removeItem(`${PAGES_CACHE_PREFIX}${pageId}`);
    } catch (error) {
        console.error('Failed to remove cached page:', error);
    }
}
