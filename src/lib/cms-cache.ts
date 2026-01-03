/**
 * CMS Cache Module
 * 
 * Re-exports IndexedDB-based cache functions.
 * This module is kept for backward compatibility with existing imports.
 * 
 * IMPORTANT: All functions are now async and return Promises.
 * Cache persists in IndexedDB until invalidated or cleared.
 */

export {
    getCachedCommitSha,
    setCachedCommitSha,
    isCacheValid,
    getCachedPageData,
    setCachedPageData,
    getCachedPagesList,
    setCachedPagesList,
    getCachedGlobals,
    setCachedGlobals,
    invalidateCache,
    getCachedPageIds,
    removeCachedPage,
} from './idb-storage';
