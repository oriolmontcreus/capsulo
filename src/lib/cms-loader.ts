import type { PageData } from './form-builder';
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
 * @param pageData - The page data containing all components
 * @param schemaKey - The unique schema key (e.g., 'hero', 'footer')
 * @param locale - The locale to extract values for (optional, auto-detected from Astro context)
 * @returns The component data as a flat object with field values
 */
export function getComponentDataByKey(
    pageData: PageData | null,
    schemaKey: string,
    locale?: string
): Record<string, any> | null {
    if (!pageData) return null;

    // Find the schema with the matching key
    const schemas = getAllSchemas();
    const schema = schemas.find(s => s.key === schemaKey);

    if (!schema) {
        console.warn(`Schema with key "${schemaKey}" not found`);
        return null;
    }

    // Find the component with the matching schema name
    const component = pageData.components.find(c => c.schemaName === schema.name);

    if (!component) {
        console.warn(`Component with schema "${schema.name}" not found in page data`);
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
    // Fast path: check translatable flag first (O(1) operation)
    if (fieldData.translatable === true) {
        const value = fieldData.value;
        const defaultLocale = capsuloConfig.i18n?.defaultLocale || 'en';
        const targetLocale = locale || defaultLocale;

        // For translatable fields, we KNOW the value is an object with locale keys
        // No need to check - just extract directly (truly O(1))
        return value?.[targetLocale] || value?.[defaultLocale] || '';
    }

    // Fast path for explicitly non-translatable fields (O(1) operation)
    return fieldData.value;
}

/**
 * Gets all components data for a page, organized by schema key
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

        // Extract values from component data with locale support
        const componentValues: Record<string, any> = {};

        for (const [key, field] of Object.entries(component.data)) {
            componentValues[key] = extractFieldValue(field, locale);
        }

        componentsData[schema.key] = componentValues;
    }

    return componentsData;
}