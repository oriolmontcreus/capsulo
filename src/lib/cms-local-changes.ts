/**
 * CMS Local Changes Module
 * 
 * Re-exports IndexedDB-based draft storage functions.
 * This module is kept for backward compatibility with existing imports.
 * 
 * IMPORTANT: All functions are now async and return Promises.
 * Draft changes persist in IndexedDB until explicitly committed or cleared.
 */

export {
    savePageDraft,
    getPageDraft,
    saveGlobalsDraft,
    getGlobalsDraft,
    hasGlobalsDraft,
    getChangedPageIds,
    clearAllDrafts,
    updateFieldInPageDraft,
    updateFieldInGlobalsDraft,
} from './idb-storage';
