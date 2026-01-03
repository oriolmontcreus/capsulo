/**
 * IndexedDB Storage Module
 * 
 * Provides IndexedDB-based storage for CMS draft changes and cache data.
 * Uses the 'idb' library for a clean Promise-based API.
 * 
 * Database structure:
 * - drafts: Stores unsaved page/globals changes (replaces sessionStorage)
 * - cache: Stores cached page/globals data with commit SHA (replaces localStorage)
 * - meta: Stores metadata like commit SHA, changed pages list
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { PageData, GlobalData } from './form-builder';
import type { PageInfo } from './admin/types';

// Database configuration
const DB_NAME = 'cms_db';
const DB_VERSION = 1;

// Store names
const STORES = {
    DRAFTS: 'drafts',
    CACHE: 'cache',
    META: 'meta',
} as const;

// Meta keys
const META_KEYS = {
    COMMIT_SHA: 'commit_sha',
    CACHE_TIMESTAMP: 'cache_timestamp',
    CHANGED_PAGES: 'changed_pages',
} as const;

// Cache expiry time - 24 hours (in ms)
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Type definitions for database schema
interface DraftEntry {
    type: 'page' | 'globals';
    data: PageData | GlobalData;
    updatedAt: number;
}

interface CacheEntry<T = unknown> {
    data: T;
    commitSha: string;
    timestamp: number;
}

interface CMSDBSchema extends DBSchema {
    drafts: {
        key: string;
        value: DraftEntry;
    };
    cache: {
        key: string;
        value: CacheEntry;
    };
    meta: {
        key: string;
        value: unknown;
    };
}

// Singleton database instance
let dbInstance: IDBPDatabase<CMSDBSchema> | null = null;
let dbInitPromise: Promise<IDBPDatabase<CMSDBSchema>> | null = null;

/**
 * Check if we're in a browser environment with IndexedDB support
 */
function isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

/**
 * Initialize and get the database instance
 */
async function getDB(): Promise<IDBPDatabase<CMSDBSchema> | null> {
    if (!isBrowser()) return null;

    if (dbInstance) return dbInstance;

    // Reuse existing initialization promise to prevent race conditions
    if (dbInitPromise) return dbInitPromise;

    dbInitPromise = openDB<CMSDBSchema>(DB_NAME, DB_VERSION, {
        upgrade(db) {
            // Create drafts store
            if (!db.objectStoreNames.contains(STORES.DRAFTS)) {
                db.createObjectStore(STORES.DRAFTS);
            }
            // Create cache store
            if (!db.objectStoreNames.contains(STORES.CACHE)) {
                db.createObjectStore(STORES.CACHE);
            }
            // Create meta store
            if (!db.objectStoreNames.contains(STORES.META)) {
                db.createObjectStore(STORES.META);
            }
        },
    });

    dbInstance = await dbInitPromise;
    return dbInstance;
}

// ============================================================================
// DRAFT OPERATIONS (replaces sessionStorage in cms-local-changes.ts)
// ============================================================================

/**
 * Save page draft to IndexedDB
 */
export async function savePageDraft(pageId: string, data: PageData): Promise<void> {
    const db = await getDB();
    if (!db) return;

    try {
        const key = `page:${pageId}`;
        const entry: DraftEntry = {
            type: 'page',
            data,
            updatedAt: Date.now(),
        };
        await db.put(STORES.DRAFTS, entry, key);

        // Track changed pages
        const changedPages = await getChangedPageIds();
        if (!changedPages.includes(pageId)) {
            changedPages.push(pageId);
            await db.put(STORES.META, changedPages, META_KEYS.CHANGED_PAGES);
        }
    } catch (error) {
        console.error('Failed to save page draft to IndexedDB:', error);
    }
}

/**
 * Get page draft from IndexedDB
 */
export async function getPageDraft(pageId: string): Promise<PageData | null> {
    const db = await getDB();
    if (!db) return null;

    try {
        const key = `page:${pageId}`;
        const entry = await db.get(STORES.DRAFTS, key);
        return entry?.data as PageData | null;
    } catch (error) {
        console.error('Failed to get page draft from IndexedDB:', error);
        return null;
    }
}

/**
 * Save globals draft to IndexedDB
 */
export async function saveGlobalsDraft(data: GlobalData): Promise<void> {
    const db = await getDB();
    if (!db) return;

    try {
        const entry: DraftEntry = {
            type: 'globals',
            data,
            updatedAt: Date.now(),
        };
        await db.put(STORES.DRAFTS, entry, 'globals');
    } catch (error) {
        console.error('Failed to save globals draft to IndexedDB:', error);
    }
}

/**
 * Get globals draft from IndexedDB
 */
export async function getGlobalsDraft(): Promise<GlobalData | null> {
    const db = await getDB();
    if (!db) return null;

    try {
        const entry = await db.get(STORES.DRAFTS, 'globals');
        return entry?.data as GlobalData | null;
    } catch (error) {
        console.error('Failed to get globals draft from IndexedDB:', error);
        return null;
    }
}

/**
 * Check if globals have a draft
 */
export async function hasGlobalsDraft(): Promise<boolean> {
    const db = await getDB();
    if (!db) return false;

    try {
        const entry = await db.get(STORES.DRAFTS, 'globals');
        return entry !== undefined;
    } catch {
        return false;
    }
}

/**
 * Get list of page IDs that have changes
 */
export async function getChangedPageIds(): Promise<string[]> {
    const db = await getDB();
    if (!db) return [];

    try {
        const data = await db.get(STORES.META, META_KEYS.CHANGED_PAGES);
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Failed to get changed pages from IndexedDB:', error);
        return [];
    }
}

/**
 * Clear all drafts from IndexedDB (after successful commit)
 */
export async function clearAllDrafts(): Promise<void> {
    const db = await getDB();
    if (!db) return;

    try {
        // Clear drafts store
        await db.clear(STORES.DRAFTS);
        // Clear changed pages list
        await db.delete(STORES.META, META_KEYS.CHANGED_PAGES);
    } catch (error) {
        console.error('Failed to clear drafts from IndexedDB:', error);
    }
}

/**
 * Update a specific field value within a page draft
 */
export async function updateFieldInPageDraft(
    pageId: string,
    componentId: string,
    fieldName: string,
    newValue: unknown,
    locale?: string,
    fieldType?: string
): Promise<boolean> {
    const db = await getDB();
    if (!db) return false;

    try {
        const draft = await getPageDraft(pageId);
        if (!draft || !draft.components) return false;

        const componentIndex = draft.components.findIndex(c => c.id === componentId);
        if (componentIndex === -1) return false;

        const component = draft.components[componentIndex];
        if (!component.data) {
            component.data = {};
        }

        updateDraftField(component.data, fieldName, newValue, locale, fieldType);
        await savePageDraft(pageId, draft);
        return true;
    } catch (error) {
        console.error('Failed to update field in page draft:', error);
        return false;
    }
}

/**
 * Update a specific field value within globals draft
 */
export async function updateFieldInGlobalsDraft(
    variableId: string,
    fieldName: string,
    newValue: unknown,
    locale?: string,
    fieldType?: string
): Promise<boolean> {
    const db = await getDB();
    if (!db) return false;

    try {
        const draft = await getGlobalsDraft();
        if (!draft || !draft.variables) return false;

        const variableIndex = draft.variables.findIndex(v => v.id === variableId);
        if (variableIndex === -1) return false;

        const variable = draft.variables[variableIndex];
        if (!variable.data) {
            variable.data = {};
        }

        updateDraftField(variable.data, fieldName, newValue, locale, fieldType);
        await saveGlobalsDraft(draft);
        return true;
    } catch (error) {
        console.error('Failed to update field in globals draft:', error);
        return false;
    }
}

/**
 * Shared helper to update a field value in local drafts
 */
function updateDraftField(
    data: Record<string, unknown>,
    fieldName: string,
    newValue: unknown,
    locale?: string,
    fieldType?: string
): void {
    const field = data[fieldName] as { type?: string; value?: unknown } | undefined;

    // Handle translatable fields (with locale)
    if (locale && field?.value && typeof field.value === 'object' && !Array.isArray(field.value)) {
        (field.value as Record<string, unknown>)[locale] = newValue;
    } else {
        if (!field) {
            data[fieldName] = { type: fieldType || 'unknown', value: newValue };
        } else {
            field.value = newValue;
            if (fieldType && field.type === 'unknown') {
                field.type = fieldType;
            }
        }
    }
}

// ============================================================================
// CACHE OPERATIONS (replaces localStorage in cms-cache.ts)
// ============================================================================

/**
 * Get the stored commit SHA from cache
 */
export async function getCachedCommitSha(): Promise<string | null> {
    const db = await getDB();
    if (!db) return null;

    try {
        const sha = await db.get(STORES.META, META_KEYS.COMMIT_SHA);
        return typeof sha === 'string' ? sha : null;
    } catch {
        return null;
    }
}

/**
 * Set the latest commit SHA in cache
 */
export async function setCachedCommitSha(sha: string): Promise<boolean> {
    const db = await getDB();
    if (!db) return false;

    try {
        await db.put(STORES.META, sha, META_KEYS.COMMIT_SHA);
        await db.put(STORES.META, Date.now(), META_KEYS.CACHE_TIMESTAMP);
        return true;
    } catch (error) {
        console.error('Failed to set cached commit SHA:', error);
        return false;
    }
}

/**
 * Check if the cache is valid (not expired and matches current commit SHA)
 */
export async function isCacheValid(currentCommitSha: string): Promise<boolean> {
    const db = await getDB();
    if (!db) return false;

    try {
        const cachedSha = await getCachedCommitSha();
        if (!cachedSha || cachedSha !== currentCommitSha) {
            return false;
        }

        const timestamp = await db.get(STORES.META, META_KEYS.CACHE_TIMESTAMP);
        if (typeof timestamp !== 'number') return false;

        const age = Date.now() - timestamp;
        return age < CACHE_MAX_AGE_MS;
    } catch {
        return false;
    }
}

/**
 * Get cached page data
 */
export async function getCachedPageData(pageId: string): Promise<PageData | null> {
    const db = await getDB();
    if (!db) return null;

    try {
        const key = `page:${pageId}`;
        const entry = await db.get(STORES.CACHE, key);
        return entry?.data as PageData | null;
    } catch {
        return null;
    }
}

/**
 * Set cached page data
 */
export async function setCachedPageData(pageId: string, data: PageData, commitSha: string): Promise<boolean> {
    const db = await getDB();
    if (!db) return false;

    try {
        const key = `page:${pageId}`;
        const entry: CacheEntry<PageData> = {
            data,
            commitSha,
            timestamp: Date.now(),
        };
        await db.put(STORES.CACHE, entry, key);
        return true;
    } catch (error) {
        console.error('Failed to cache page data:', error);
        return false;
    }
}

/**
 * Get cached pages list
 */
export async function getCachedPagesList(): Promise<PageInfo[] | null> {
    const db = await getDB();
    if (!db) return null;

    try {
        const entry = await db.get(STORES.CACHE, 'pages_list');
        if (!entry || !Array.isArray(entry.data)) return null;

        // Validate each element conforms to PageInfo
        const isValid = (entry.data as unknown[]).every(item =>
            item &&
            typeof item === 'object' &&
            typeof (item as PageInfo).id === 'string' &&
            typeof (item as PageInfo).name === 'string' &&
            typeof (item as PageInfo).path === 'string'
        );

        return isValid ? (entry.data as PageInfo[]) : null;
    } catch {
        return null;
    }
}

/**
 * Set cached pages list
 */
export async function setCachedPagesList(pages: PageInfo[], commitSha: string): Promise<boolean> {
    const db = await getDB();
    if (!db) return false;

    try {
        const entry: CacheEntry<PageInfo[]> = {
            data: pages,
            commitSha,
            timestamp: Date.now(),
        };
        await db.put(STORES.CACHE, entry, 'pages_list');
        return true;
    } catch (error) {
        console.error('Failed to cache pages list:', error);
        return false;
    }
}

/**
 * Get cached globals data
 */
export async function getCachedGlobals(): Promise<GlobalData | null> {
    const db = await getDB();
    if (!db) return null;

    try {
        const entry = await db.get(STORES.CACHE, 'globals');
        return entry?.data as GlobalData | null;
    } catch {
        return null;
    }
}

/**
 * Set cached globals data
 */
export async function setCachedGlobals(data: GlobalData, commitSha: string): Promise<boolean> {
    const db = await getDB();
    if (!db) return false;

    try {
        const entry: CacheEntry<GlobalData> = {
            data,
            commitSha,
            timestamp: Date.now(),
        };
        await db.put(STORES.CACHE, entry, 'globals');
        return true;
    } catch (error) {
        console.error('Failed to cache globals:', error);
        return false;
    }
}

/**
 * Invalidate all cached data (when commit SHA changes)
 */
export async function invalidateCache(): Promise<void> {
    const db = await getDB();
    if (!db) return;

    try {
        await db.clear(STORES.CACHE);
        await db.delete(STORES.META, META_KEYS.COMMIT_SHA);
        await db.delete(STORES.META, META_KEYS.CACHE_TIMESTAMP);
    } catch (error) {
        console.error('Failed to invalidate cache:', error);
    }
}

/**
 * Get list of cached page IDs
 */
export async function getCachedPageIds(): Promise<string[]> {
    const db = await getDB();
    if (!db) return [];

    try {
        const keys = await db.getAllKeys(STORES.CACHE);
        return keys
            .filter(key => typeof key === 'string' && key.startsWith('page:'))
            .map(key => (key as string).substring(5));
    } catch {
        return [];
    }
}

/**
 * Remove a specific page from cache
 */
export async function removeCachedPage(pageId: string): Promise<void> {
    const db = await getDB();
    if (!db) return;

    try {
        await db.delete(STORES.CACHE, `page:${pageId}`);
    } catch (error) {
        console.error('Failed to remove cached page:', error);
    }
}
