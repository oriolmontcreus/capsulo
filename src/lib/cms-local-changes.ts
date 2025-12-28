import type { PageData, GlobalData } from './form-builder';

const STORAGE_PREFIX = 'cms_draft_';
const PAGES_PREFIX = `${STORAGE_PREFIX}pages_`;
const GLOBALS_KEY = `${STORAGE_PREFIX}globals`;
const CHANGED_PAGES_KEY = `${STORAGE_PREFIX}changed_pages`;

/**
 * LocalStorage utility for persisting CMS changes before they are committed to the repo.
 * This allows changes to survive page navigation and be compared against remote data.
 */

/**
 * Save page draft to localStorage
 */
export function savePageDraft(pageId: string, data: PageData): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(`${PAGES_PREFIX}${pageId}`, JSON.stringify(data));

        // Track which pages have changes
        const changedPages = getChangedPageIds();
        if (!changedPages.includes(pageId)) {
            changedPages.push(pageId);
            localStorage.setItem(CHANGED_PAGES_KEY, JSON.stringify(changedPages));
        }
    } catch (error) {
        console.error('Failed to save page draft to localStorage:', error);
    }
}

/**
 * Get page draft from localStorage
 */
export function getPageDraft(pageId: string): PageData | null {
    if (typeof window === 'undefined') return null;

    try {
        const data = localStorage.getItem(`${PAGES_PREFIX}${pageId}`);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Failed to get page draft from localStorage:', error);
        return null;
    }
}

/**
 * Check if a page has a draft
 */
export function hasPageDraft(pageId: string): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(`${PAGES_PREFIX}${pageId}`) !== null;
}

/**
 * Remove a specific page draft
 */
export function removePageDraft(pageId: string): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.removeItem(`${PAGES_PREFIX}${pageId}`);

        // Update changed pages list
        const changedPages = getChangedPageIds().filter(id => id !== pageId);
        localStorage.setItem(CHANGED_PAGES_KEY, JSON.stringify(changedPages));
    } catch (error) {
        console.error('Failed to remove page draft from localStorage:', error);
    }
}

/**
 * Save globals draft to localStorage
 */
export function saveGlobalsDraft(data: GlobalData): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(GLOBALS_KEY, JSON.stringify(data));
    } catch (error) {
        console.error('Failed to save globals draft to localStorage:', error);
    }
}

/**
 * Get globals draft from localStorage
 */
export function getGlobalsDraft(): GlobalData | null {
    if (typeof window === 'undefined') return null;

    try {
        const data = localStorage.getItem(GLOBALS_KEY);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Failed to get globals draft from localStorage:', error);
        return null;
    }
}

/**
 * Check if globals have a draft
 */
export function hasGlobalsDraft(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(GLOBALS_KEY) !== null;
}

/**
 * Remove globals draft
 */
export function removeGlobalsDraft(): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.removeItem(GLOBALS_KEY);
    } catch (error) {
        console.error('Failed to remove globals draft from localStorage:', error);
    }
}

/**
 * Get list of page IDs that have changes
 */
export function getChangedPageIds(): string[] {
    if (typeof window === 'undefined') return [];

    try {
        const data = localStorage.getItem(CHANGED_PAGES_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Failed to get changed pages from localStorage:', error);
        return [];
    }
}

/**
 * Clear all drafts from localStorage (after successful commit)
 */
export function clearAllDrafts(): void {
    if (typeof window === 'undefined') return;

    try {
        // Get all changed pages to clear them
        const changedPages = getChangedPageIds();
        changedPages.forEach(pageId => {
            localStorage.removeItem(`${PAGES_PREFIX}${pageId}`);
        });

        // Clear globals and changed pages list
        localStorage.removeItem(GLOBALS_KEY);
        localStorage.removeItem(CHANGED_PAGES_KEY);
    } catch (error) {
        console.error('Failed to clear drafts from localStorage:', error);
    }
}

/**
 * Check if there are any unsaved drafts
 */
export function hasAnyDrafts(): boolean {
    if (typeof window === 'undefined') return false;

    return getChangedPageIds().length > 0 || hasGlobalsDraft();
}

/**
 * Shared helper to update a field value in local drafts.
 * Handles both regular and translatable fields, ensuring type safety.
 */
function updateDraftField(
    data: Record<string, any>,
    fieldName: string,
    newValue: any,
    locale?: string
): void {
    const field = data[fieldName];

    // Handle translatable fields (with locale)
    // We strictly check that the value is an object (and not an array) to determine if it's a translation map
    if (locale && field?.value && typeof field.value === 'object' && !Array.isArray(field.value)) {
        field.value[locale] = newValue;
    } else {
        // Regular field or setting entire value
        if (!field) {
            // If field doesn't exist, create it with 'unknown' type to avoid incorrect 'input' assumption
            data[fieldName] = { type: 'unknown', value: newValue };
        } else {
            // Update existing value, preserving type
            field.value = newValue;
        }
    }
}

/**
 * Update a specific field value within a page draft
 * Used for undoing individual field changes
 */
export function updateFieldInPageDraft(
    pageId: string,
    componentId: string,
    fieldName: string,
    newValue: any,
    locale?: string
): boolean {
    if (typeof window === 'undefined') return false;

    try {
        const draft = getPageDraft(pageId);
        if (!draft || !draft.components) return false;

        const componentIndex = draft.components.findIndex(c => c.id === componentId);
        if (componentIndex === -1) return false;

        const component = draft.components[componentIndex];
        if (!component.data) {
            component.data = {};
        }

        // Use shared helper to update field data
        updateDraftField(component.data, fieldName, newValue, locale);


        // Save updated draft
        savePageDraft(pageId, draft);
        return true;
    } catch (error) {
        console.error('Failed to update field in page draft:', error);
        return false;
    }
}

/**
 * Update a specific field value within globals draft
 * Used for undoing individual field changes in global variables
 */
export function updateFieldInGlobalsDraft(
    variableId: string,
    fieldName: string,
    newValue: any,
    locale?: string
): boolean {
    if (typeof window === 'undefined') return false;

    try {
        const draft = getGlobalsDraft();
        if (!draft || !draft.variables) return false;

        const variableIndex = draft.variables.findIndex(v => v.id === variableId);
        if (variableIndex === -1) return false;

        const variable = draft.variables[variableIndex];
        if (!variable.data) {
            variable.data = {};
        }

        // Use shared helper to update field data
        updateDraftField(variable.data, fieldName, newValue, locale);


        // Save updated draft
        saveGlobalsDraft(draft);
        return true;
    } catch (error) {
        console.error('Failed to update field in globals draft:', error);
        return false;
    }
}
