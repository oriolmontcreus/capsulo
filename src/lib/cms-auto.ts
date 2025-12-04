/**
 * Automatic CMS Integration
 * 
 * This utility automatically loads CMS data for pages and provides simplified access.
 * Pages just need to call getPageCMS() once, and all data is available.
 */

import type { AstroGlobal } from 'astro';
import { loadPageData, getAllComponentsData, getGlobalVar } from './cms-loader';
import { isValidLocale, DEFAULT_LOCALE, LOCALES, getLocaleFromPathname } from './i18n-utils';
import { getSchemaKeyFromImportPath } from './cms-component-injector';

/**
 * Extracts page ID from Astro URL pathname
 * Matches the logic used in vite-plugin-component-scanner
 */
function getPageIdFromUrl(pathname: string): string {
    // Remove locale prefix if present (works with Astro's i18n routing)
    // Get locales from config dynamically
    const localePattern = new RegExp(`^/(${LOCALES.join('|')})(/|$)`);
    let cleanPath = pathname.replace(localePattern, '/');
    if (cleanPath === '') cleanPath = '/';
    
    // Remove leading/trailing slashes and convert to page ID
    let pageId = cleanPath
        .replace(/^\/+|\/+$/g, '')
        .replace(/\//g, '-');
    
    // Handle root/index page
    if (!pageId || pageId === 'index') {
        return 'index';
    }
    
    return pageId;
}

/**
 * Extracts and validates locale from Astro request
 * Tries pathname first, then falls back to params.locale
 * Returns undefined if no valid locale is found
 */
function getLocaleFromAstro(astro: AstroGlobal): string | undefined {
    // Try to get locale from pathname first
    const pathnameSegments = astro.url.pathname.split('/').filter(Boolean);
    const firstSegment = pathnameSegments[0];
    let locale: string | undefined;
    
    if (firstSegment && isValidLocale(firstSegment)) {
        // Pathname contains a valid locale
        locale = firstSegment;
    } else if (astro.params && astro.params.locale) {
        // Pathname doesn't contain a locale, try params
        locale = astro.params.locale as string;
    }
    
    // Validate locale and return undefined if invalid
    if (locale && !isValidLocale(locale)) {
        return undefined;
    }
    
    return locale;
}

/**
 * Automatically loads all CMS data for the current page
 * Auto-detects page ID from URL and locale from params
 * 
 * @param astro - Astro global object (required for auto-detection)
 * @returns Object with components data, globals, and locale
 * 
 * @example
 * ```astro
 * ---
 * import Hero from '@/components/capsulo/hero/Hero.astro';
 * import { getPageCMS } from '@/lib/cms-auto';
 * 
 * const cms = await getPageCMS(Astro);
 * ---
 * <Hero {...cms.components.hero} />
 * ```
 */
export async function getPageCMS(astro: AstroGlobal): Promise<{
    components: Record<string, Record<string, any>>;
    globals: Record<string, any> | null;
    locale: string;
}> {
    // Get locale using shared helper (pathname first, then params fallback)
    let locale = getLocaleFromAstro(astro) || DEFAULT_LOCALE;
    
    // Auto-detect page ID from URL
    const pageId = getPageIdFromUrl(astro.url.pathname);
    
    // Load page data
    const pageData = await loadPageData(pageId);
    
    // Get all components data (automatically handles locale)
    const components = getAllComponentsData(pageData, locale);
    
    // Load globals
    const globals = await getGlobalVar(locale);
    
    return {
        components,
        globals,
        locale: locale || DEFAULT_LOCALE,
    };
}

/**
 * Automatically loads CMS data for the current page
 * Auto-detects page ID from URL and locale from params
 * 
 * @param astro - Astro global object (required for auto-detection)
 * @returns Object with components data, globals, and helper functions
 * 
 * @example
 * ```astro
 * ---
 * import Hero from '@/components/capsulo/hero/Hero.astro';
 * import { autoLoadCMS } from '@/lib/cms-auto';
 * 
 * const cms = await autoLoadCMS(Astro);
 * ---
 * <Hero {...cms.getProps(Hero)} />
 * ```
 */
export async function autoLoadCMS(astro: AstroGlobal): Promise<{
    components: Record<string, Record<string, any>>;
    globals: Record<string, any> | null;
    locale: string;
    /**
     * Automatically gets props for a component based on its import path
     * @param component - The component (used to extract schema key from import)
     * @param index - Instance index for multi-instance components (default: 0)
     * @returns Component props object
     */
    getProps: (component: any, index?: number) => Record<string, any>;
}> {
    // Get locale using shared helper (pathname first, then params fallback)
    const locale = getLocaleFromAstro(astro) || DEFAULT_LOCALE;
    
    // Auto-detect page ID from URL
    const pageId = getPageIdFromUrl(astro.url.pathname);
    
    // Load page data
    const pageData = await loadPageData(pageId);
    
    // Get all components data (automatically handles locale)
    const components = getAllComponentsData(pageData, locale);
    
    // Load globals
    const globals = await getGlobalVar(locale);
    
    /**
     * Auto-injects props for a component
     * Extracts schema key from component's import path automatically
     */
    function getProps(component: any, index: number = 0): Record<string, any> {
        // Try to get schema key from component's module path
        // This works because Astro components have metadata about their source
        let schemaKey: string | null = null;
        
        // Try to extract from component's file path if available
        // Relaxed check to allow functions with $$filepath metadata
        if (component && '$$filepath' in component) {
            schemaKey = getSchemaKeyFromImportPath(component.$$filepath);
        }
        
        // Fallback: try to get from component name (Hero -> hero)
        if (!schemaKey && component && component.name) {
            schemaKey = component.name.toLowerCase().replace(/component$/, '');
        }
        
        // If we still don't have a schema key, return empty props
        if (!schemaKey) {
            console.warn(`[CMS Auto] Could not determine schema key for component. Make sure component is imported from @/components/capsulo/[schemaKey]/`);
            return {};
        }
        
        // Get component data
        const componentData = components[schemaKey];
        
        if (!componentData) {
            console.warn(`[CMS Auto] No CMS data found for schema key "${schemaKey}"`);
            return {};
        }
        
        // Support multi-instance components: if componentData is an array, use index
        if (Array.isArray(componentData)) {
            // Bounds check for array index
            if (index >= 0 && index < componentData.length) {
                return componentData[index];
            } else {
                // Fallback: return first item if index is out of bounds, or empty object if array is empty
                if (componentData.length > 0) {
                    console.warn(`[CMS Auto] Index ${index} out of bounds for schema key "${schemaKey}" (array length: ${componentData.length}). Using first item.`);
                    return componentData[0];
                } else {
                    console.warn(`[CMS Auto] Array for schema key "${schemaKey}" is empty.`);
                    return {};
                }
            }
        }
        
        // Single instance component: return the data directly
        return componentData;
    }
    
    return {
        components,
        globals,
        locale: locale || DEFAULT_LOCALE,
        getProps,
    };
}
