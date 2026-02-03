import type { PageData, GlobalData } from './form-builder';
import { getAllSchemas } from './form-builder';
import { DEFAULT_LOCALE } from './i18n-utils';
import fs from 'node:fs';
import path from 'node:path';

// Preview store imports (dev only) - populated by vite-plugin-cms-preview
import { previewStore, globalsPreviewStore } from './vite-plugin-cms-preview';

/**
 * Loads CMS data for a specific page from the file system
 * @param pageName - The name of the page (e.g., 'index', 'about')
 * @returns PageData or null if not found
 */
export async function loadPageData(pageName: string): Promise<PageData | null> {
    try {
        // DEV: Check in-memory preview store first (no disk I/O)
        if (import.meta.env.DEV && previewStore.has(pageName)) {
            return previewStore.get(pageName)!;
        }

        // Build the file path relative to project root
        const filePath = path.join(process.cwd(), 'src', 'content', 'pages', `${pageName}.json`);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.warn(`[CMS Loader] CMS data file not found: ${filePath}`);
            return null;
        }

        // Read and parse the JSON file
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data: PageData = JSON.parse(fileContent);

        return data;
    } catch (error) {
        console.error(`[CMS Loader] Failed to load page data for ${pageName}:`, error);
        return null;
    }
}


/**
 * Deep merges locale-specific values with fallback to default locale values.
 * This handles arrays where some items might be null (not translated),
 * and objects where some properties might be missing.
 * 
 * @param targetValue - The value from the target locale (may have null items or missing properties)
 * @param fallbackValue - The value from the default locale (complete data)
 * @param seen - WeakSet to track visited objects and prevent circular references
 * @returns Merged value with fallbacks applied
 */
function deepMergeWithFallback(targetValue: any, fallbackValue: any, seen = new WeakSet()): any {
    // If target is null/undefined, use fallback entirely
    if (targetValue === null || targetValue === undefined) {
        return fallbackValue;
    }

    // If fallback is null/undefined, use target
    if (fallbackValue === null || fallbackValue === undefined) {
        return targetValue;
    }

    // Guard against circular references
    if (typeof targetValue === 'object' && targetValue !== null) {
        if (seen.has(targetValue)) {
            return targetValue;
        }
        seen.add(targetValue);
    }

    // Handle arrays - merge item by item
    if (Array.isArray(targetValue) && Array.isArray(fallbackValue)) {
        // Use the longer array length to preserve all items
        const maxLength = Math.max(targetValue.length, fallbackValue.length);
        const result: any[] = [];

        for (let i = 0; i < maxLength; i++) {
            const targetItem = targetValue[i];
            const fallbackItem = fallbackValue[i];
            result.push(deepMergeWithFallback(targetItem, fallbackItem, seen));
        }

        return result;
    }

    // Handle objects - merge property by property
    if (typeof targetValue === 'object' && typeof fallbackValue === 'object' &&
        !Array.isArray(targetValue) && !Array.isArray(fallbackValue)) {
        const result: Record<string, any> = {};

        // Get all keys from both objects
        const allKeys = new Set([
            ...Object.keys(fallbackValue),
            ...Object.keys(targetValue)
        ]);

        for (const key of allKeys) {
            // Skip internal keys like _id - always prefer target's _id if it exists
            if (key === '_id') {
                result[key] = targetValue[key] ?? fallbackValue[key];
            } else {
                result[key] = deepMergeWithFallback(targetValue[key], fallbackValue[key], seen);
            }
        }

        return result;
    }

    // For primitives (string, number, boolean), prefer target if it has a value
    // Empty strings should fallback to default
    if (typeof targetValue === 'string' && targetValue === '') {
        return fallbackValue;
    }

    return targetValue;
}

/**
 * Extracts the appropriate value from a field based on locale
 * @param fieldData - The complete field data object with type, translatable flag, and value
 * @param locale - The target locale (optional, will use default if not provided)
 * @returns The localized value or fallback
 */
function extractFieldValue(fieldData: any, locale?: string): any {
    const defaultLocale = DEFAULT_LOCALE;
    const targetLocale = locale || defaultLocale;
    let value: any;
    let isInternalLink = false;

    // Fast path: check translatable flag first (O(1) operation)
    if (fieldData.translatable === true) {
        const rawValue = fieldData.value;

        // Check if value is an object with locale keys (translation mode)
        // Guard: ensure it actually looks like a localized map by checking for keys
        if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue) && (targetLocale in rawValue || defaultLocale in rawValue)) {
            const targetValue = rawValue[targetLocale];
            const fallbackValue = rawValue[defaultLocale];

            // If we're on the default locale or there's no fallback, use target directly
            if (targetLocale === defaultLocale || fallbackValue === undefined) {
                value = targetValue || '';
            } else {
                // Deep merge target with fallback for arrays/objects
                value = deepMergeWithFallback(targetValue, fallbackValue);
            }
        } else {
            // Otherwise, value is a plain string or non-localized object
            value = rawValue || '';
        }
    }
    // Check if this is an internal link that needs locale resolution
    else if (fieldData._internalLink === true && fieldData.value) {
        value = `/${targetLocale}${fieldData.value}`;
        isInternalLink = true;
    }
    // Handle implicit localization (e.g. repeaters that are not marked translatable but have localized data)
    // Check if value is an object (not array/null) and has the default locale as a key
    else if (fieldData.value && typeof fieldData.value === 'object' && !Array.isArray(fieldData.value) && defaultLocale in fieldData.value) {
        const targetValue = fieldData.value[targetLocale];
        const fallbackValue = fieldData.value[defaultLocale];

        // If we're on the default locale or there's no fallback, use target directly
        if (targetLocale === defaultLocale || fallbackValue === undefined) {
            value = targetValue ?? [];
        } else {
            // Deep merge target with fallback
            value = deepMergeWithFallback(targetValue, fallbackValue);
        }
    }
    // Fast path for explicitly non-translatable fields (O(1) operation)
    else {
        value = fieldData.value;
    }

    // 1. Skip resolveGlobalRefs for internal links
    if (isInternalLink) {
        return value;
    }

    // 2. Recursive walk to resolve global refs in strings within nested structures
    const resolveDeep = (item: any): any => {
        if (typeof item === 'string') {
            return resolveGlobalRefs(item, locale);
        }
        if (Array.isArray(item)) {
            return item.map(resolveDeep);
        }
        if (item && typeof item === 'object') {
            const result: Record<string, any> = {};
            for (const key in item) {
                if (Object.prototype.hasOwnProperty.call(item, key)) {
                    result[key] = resolveDeep(item[key]);
                }
            }
            return result;
        }
        return item;
    };

    return resolveDeep(value);
}

/**
 * Gets all components data for a page, organized by schema key
 * Note: For components with multiple instances, only returns the first instance
 * @param pageData - The page data containing all components
 * @param locale - The locale to extract values for (optional, auto-detected from config)
 * @returns Object with schema keys as keys and component data as values
 */
export function getAllComponentsData(
    pageData: PageData | null,
    locale?: string
): Record<string, Record<string, any>> {
    if (!pageData) return {};

    const schemas = getAllSchemas();
    const componentsData: Record<string, Record<string, any>> = {};

    for (const component of pageData.components) {
        const schema = schemas.find(s => s.name === component.schemaName);

        if (!schema || !schema.key) continue;

        // Only include if not already added (first instance only)
        if (componentsData[schema.key]) continue;

        // Extract values from component data with locale support
        const componentValues: Record<string, any> = {};

        for (const [key, field] of Object.entries(component.data)) {
            componentValues[key] = extractFieldValue(field, locale);
        }

        componentsData[schema.key] = componentValues;
    }

    return componentsData;
}

// Global variables cache
let globalDataCache: GlobalData | null = null;
let globalDataCacheTimestamp: number = 0;
const CACHE_TTL = 5000; // 5 seconds cache

/**
 * Internal helper to load global variables data synchronously
 * Handles cache, file reading, parsing, and existence checks
 */
function loadGlobalDataHelper(): GlobalData | null {
    try {
        // DEV: Check in-memory globals preview store first (no disk I/O)
        if (import.meta.env.DEV && globalsPreviewStore.data !== null) {
            return globalsPreviewStore.data;
        }

        // Check cache first
        const now = Date.now();
        if (globalDataCache && (now - globalDataCacheTimestamp) < CACHE_TTL) {
            return globalDataCache;
        }

        // Build the file path relative to project root
        const filePath = path.join(process.cwd(), 'src', 'content', 'globals.json');

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.warn(`[CMS Loader] Global variables file not found: ${filePath}`);
            return null;
        }

        // Read and parse the JSON file
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data: GlobalData = JSON.parse(fileContent);

        // Update cache
        globalDataCache = data;
        globalDataCacheTimestamp = now;

        return data;
    } catch (error) {
        console.error(`[CMS Loader] Failed to load global variables:`, error);
        return null;
    }
}

/**
 * Loads global variables data from the file system
 * @returns GlobalData or null if not found
 */
export async function loadGlobalData(): Promise<GlobalData | null> {
    return loadGlobalDataHelper();
}

/**
 * Loads global variables data synchronously from the file system
 * Used for variable resolution during field extraction
 * @returns GlobalData or null if not found
 */
function loadGlobalDataSync(): GlobalData | null {
    return loadGlobalDataHelper();
}

/**
 * Resolves global variable references in a string (e.g. "{{siteName}}")
 * @param text - The text to resolve
 * @param locale - The current locale
 * @returns The resolved text
 */
function resolveGlobalRefs(text: string, locale?: string): string {
    if (!text || typeof text !== 'string' || !text.includes('{{')) {
        return text;
    }

    // Load global data synchronously prevents async issues in strict rendering paths
    const globalData = loadGlobalDataSync();
    if (!globalData || !globalData.variables || globalData.variables.length === 0) {
        return text;
    }

    const globals = globalData.variables.find(v => v.id === 'globals');
    if (!globals || !globals.data) {
        return text;
    }

    return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        const variableName = key.trim();
        const variableField = globals.data[variableName];

        if (variableField) {
            // Recursively extract value, but prevent infinite recursion by not resolving refs inside refs for now
            // or we could pass a flag to extractFieldValue to stop recursion
            // For safety, let's just extract the raw value and return it (assuming globals don't ref other globals for now)
            // But wait, extractFieldValue needs to handle translation.
            // We can call extractFieldValue but we need to create a version that doesn't recursivly call resolveGlobalRefs
            // to avoid infinite loops if A -> {{B}} and B -> {{A}}.

            // For now, let's just get the value and handle localization manually to avoid circular deps
            // or we can just call extractFieldValue but pass a flag. Use a slightly modified version logic here:

            const val = variableField.value;
            const defaultLocale = DEFAULT_LOCALE;
            const targetLocale = locale || defaultLocale;

            // Handle translatable fields
            if (variableField.translatable === true && val && typeof val === 'object' && !Array.isArray(val)) {
                const localizedValue = val[targetLocale] ?? val[defaultLocale];
                if (localizedValue !== undefined && localizedValue !== null) {
                    return String(localizedValue);
                }
                return match;
            }

            // Handle primitives (string, number, boolean)
            if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
                return String(val);
            }

            // Handle complex types (objects, arrays)
            if (val && typeof val === 'object') {
                return JSON.stringify(val);
            }

            // Fallback to original placeholder if value is null/undefined or otherwise unhandled
            return match;
        }

        return match; // Keep original if not found
    });
}

/**
 * Gets the global variables
 * Automatically loads global data if not already cached
 * @param locale - The locale to extract values for (optional, auto-detected from config)
 * @returns The global variable data as a flat object with field values, or null if not found
 * 
 * @example
 * // Get global variables
 * const globals = await getGlobalVar(locale);
 * // Result: { siteName: "My Site", siteEmail: "contact@example.com", ... }
 * 
 * @example
 * // Use in Astro page
 * const globals = await getGlobalVar(locale);
 * <h1>{globals?.siteName}</h1>
 */
export async function getGlobalVar(locale?: string): Promise<Record<string, any> | null> {
    // Load global data (uses cache if available)
    const globalData = await loadGlobalData();

    if (!globalData) return null;

    // Find the single global variable (should have id "globals")
    const variable = globalData.variables.find(v => v.id === 'globals');

    if (!variable) {
        console.warn(`[CMS Loader] Global variable not found`);
        return null;
    }

    // Extract values from variable data with automatic locale detection
    const variableValues: Record<string, any> = {};

    for (const [key, field] of Object.entries(variable.data)) {
        variableValues[key] = extractFieldValue(field, locale);
    }

    return variableValues;
}