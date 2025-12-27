import type { PageData, GlobalData } from './form-builder';
import { getAllSchemas } from './form-builder';
import { capsuloConfig } from './config';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Loads CMS data for a specific page from the file system
 * @param pageName - The name of the page (e.g., 'index', 'about')
 * @returns PageData or null if not found
 */
export async function loadPageData(pageName: string): Promise<PageData | null> {
    try {
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
 * Gets component data by schema key from page data
 * Supports multiple instances of the same component via the index parameter
 * @param pageData - The page data containing all components
 * @param schemaKey - The unique schema key (e.g., 'hero', 'footer')
 * @param locale - The locale to extract values for (optional, auto-detected from Astro context)
 * @param index - The instance index (0-based) for components with multiple instances (default: 0)
 * @returns The component data as a flat object with field values
 * 
 * @example
 * // Get first hero instance
 * const heroData = getComponentDataByKey(pageData, 'hero', locale, 0);
 * 
 * @example
 * // Get second hero instance
 * const hero2Data = getComponentDataByKey(pageData, 'hero', locale, 1);
 */
export function getComponentDataByKey(
    pageData: PageData | null,
    schemaKey: string,
    locale?: string,
    index: number = 0
): Record<string, any> | null {
    if (!pageData) return null;

    // Find the schema with the matching key
    const schemas = getAllSchemas();
    const schema = schemas.find(s => s.key === schemaKey);

    if (!schema) {
        console.warn(`[CMS Loader] Schema with key "${schemaKey}" not found`);
        return null;
    }

    // Try to find component by deterministic ID first (new format)
    const deterministicId = `${schemaKey}-${index}`;
    let component = pageData.components.find(c => c.id === deterministicId);

    // Fallback: if not found by deterministic ID, try by schema name (backwards compatibility)
    if (!component) {
        const componentsBySchema = pageData.components.filter(c => c.schemaName === schema.name);
        component = componentsBySchema[index];
    }

    if (!component) {
        console.warn(`[CMS Loader] Component with schema key "${schemaKey}" and index ${index} not found in page data`);
        return null;
    }

    // Extract values from component data with automatic locale detection
    const componentValues: Record<string, any> = {};

    for (const [key, field] of Object.entries(component.data)) {
        componentValues[key] = extractFieldValue(field, locale);
    }

    return componentValues;
}

/**
 * Extracts the appropriate value from a field based on locale
 * @param fieldData - The complete field data object with type, translatable flag, and value
 * @param locale - The target locale (optional, will use default if not provided)
 * @returns The localized value or fallback
 */
function extractFieldValue(fieldData: any, locale?: string): any {
    const defaultLocale = capsuloConfig.i18n?.defaultLocale || 'en';
    const targetLocale = locale || defaultLocale;
    let value: any;
    let isInternalLink = false;

    // Fast path: check translatable flag first (O(1) operation)
    if (fieldData.translatable === true) {
        const rawValue = fieldData.value;
        const defaultLocale = capsuloConfig.i18n?.defaultLocale || 'en';
        const targetLocale = locale || defaultLocale;

        // Check if value is an object with locale keys (translation mode)
        // Guard: ensure it actually looks like a localized map by checking for keys
        if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue) && (targetLocale in rawValue || defaultLocale in rawValue)) {
            value = rawValue[targetLocale] || rawValue[defaultLocale] || '';
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
        value = fieldData.value[targetLocale] ?? fieldData.value[defaultLocale] ?? [];
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
}/**
 * Gets all instances of a component by schema key from page data
 * @param pageData - The page data containing all components
 * @param schemaKey - The unique schema key (e.g., 'hero', 'footer')
 * @param locale - The locale to extract values for (optional, auto-detected from Astro context)
 * @returns Array of component data objects, one per instance
 * 
 * @example
 * // Get all hero instances
 * const heroes = getAllComponentsByKey(pageData, 'hero', locale);
 * // Result: [{ title: "Hero 1", ... }, { title: "Hero 2", ... }]
 * 
 * @example
 * // Render multiple instances in Astro
 * {heroes?.map((heroData, i) => <Hero key={i} {...heroData} />)}
 */
export function getAllComponentsByKey(
    pageData: PageData | null,
    schemaKey: string,
    locale?: string
): Array<Record<string, any>> {
    if (!pageData) return [];

    // Find the schema with the matching key
    const schemas = getAllSchemas();
    const schema = schemas.find(s => s.key === schemaKey);

    if (!schema) {
        console.warn(`[CMS Loader] Schema with key "${schemaKey}" not found`);
        return [];
    }

    // Find all components matching the deterministic ID pattern
    const idPattern = new RegExp(`^${schemaKey}-(\\d+)$`);
    const matchingComponents = pageData.components
        .filter(c => idPattern.test(c.id))
        .sort((a, b) => {
            // Sort by index extracted from ID
            const indexA = parseInt(a.id.match(idPattern)?.[1] || '0', 10);
            const indexB = parseInt(b.id.match(idPattern)?.[1] || '0', 10);
            return indexA - indexB;
        });

    // Fallback: if no deterministic IDs found, filter by schema name (backwards compatibility)
    if (matchingComponents.length === 0) {
        const componentsBySchema = pageData.components.filter(c => c.schemaName === schema.name);
        return componentsBySchema.map(component => {
            const componentValues: Record<string, any> = {};
            for (const [key, field] of Object.entries(component.data)) {
                componentValues[key] = extractFieldValue(field, locale);
            }
            return componentValues;
        });
    }

    // Extract values from each component
    return matchingComponents.map(component => {
        const componentValues: Record<string, any> = {};
        for (const [key, field] of Object.entries(component.data)) {
            componentValues[key] = extractFieldValue(field, locale);
        }
        return componentValues;
    });
}

/**
 * Gets the count of component instances for a specific schema key
 * @param pageData - The page data containing all components
 * @param schemaKey - The unique schema key (e.g., 'hero', 'footer')
 * @returns Number of instances found
 * 
 * @example
 * const heroCount = getComponentCount(pageData, 'hero');
 * // Result: 2 (if there are 2 hero instances)
 */
export function getComponentCount(
    pageData: PageData | null,
    schemaKey: string
): number {
    if (!pageData) return 0;

    // Count components matching the deterministic ID pattern
    const idPattern = new RegExp(`^${schemaKey}-(\\d+)$`);
    const count = pageData.components.filter(c => idPattern.test(c.id)).length;

    if (count > 0) return count;

    // Fallback: count by schema name (backwards compatibility)
    const schemas = getAllSchemas();
    const schema = schemas.find(s => s.key === schemaKey);

    if (!schema) return 0;

    return pageData.components.filter(c => c.schemaName === schema.name).length;
}

/**
 * Gets all components data for a page, organized by schema key
 * Note: For components with multiple instances, only returns the first instance
 * Use getAllComponentsByKey() for multi-instance support
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
export function loadGlobalDataSync(): GlobalData | null {
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
            const defaultLocale = capsuloConfig.i18n?.defaultLocale || 'en';
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