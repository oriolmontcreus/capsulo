/**
 * Automatic CMS Integration
 * 
 * This utility automatically loads CMS data for pages and provides simplified access.
 * Pages just need to call getPageCMS() once, and all data is available.
 */

import { loadPageData, getAllComponentsData, getGlobalVar } from './cms-loader';
import { isValidLocale, DEFAULT_LOCALE } from './i18n-utils';

/**
 * Extracts page ID from Astro URL pathname
 * Matches the logic used in vite-plugin-component-scanner
 */
function getPageIdFromUrl(pathname: string): string {
    // Remove locale prefix if present
    //TODO what he hell is this hardcoded bs
    const localePattern = /^\/(en|es|fr|de|it|pt|ru|zh|ja|ko)(\/|$)/;
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
export async function getPageCMS(astro: any): Promise<{
    components: Record<string, Record<string, any>>;
    globals: Record<string, any> | null;
    locale: string;
}> {
    // Extract locale from Astro params
    let locale: string | undefined;
    if (astro.params && astro.params.locale) {
        locale = astro.params.locale as string;
    }
    
    // Validate locale
    if (locale && !isValidLocale(locale)) {
        locale = undefined;
    }
    
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
export async function autoLoadCMS(astro: any): Promise<{
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
    // Extract locale from Astro params
    let locale: string | undefined;
    if (astro.params && astro.params.locale) {
        locale = astro.params.locale as string;
    }
    
    // Validate locale
    if (locale && !isValidLocale(locale)) {
        locale = undefined;
    }
    
    // Auto-detect page ID from URL
    const pageId = getPageIdFromUrl(astro.url.pathname);
    
    // Load page data
    const pageData = await loadPageData(pageId);
    
    // Get all components data (automatically handles locale)
    const components = getAllComponentsData(pageData, locale);
    
    // Load globals
    const globals = await getGlobalVar(locale);
    
    /**
     * Extracts schema key from component import path
     * @example '@/components/capsulo/hero/Hero.astro' -> 'hero'
     */
    function getSchemaKeyFromImportPath(importPath: string): string | null {
        const match = importPath.match(/@\/components\/capsulo\/([^\/]+)\//);
        return match ? match[1] : null;
    }
    
    /**
     * Auto-injects props for a component
     * Extracts schema key from component's import path automatically
     */
    function getProps(component: any, index: number = 0): Record<string, any> {
        // Try to get schema key from component's module path
        // This works because Astro components have metadata about their source
        let schemaKey: string | null = null;
        
        // Try to extract from component's file path if available
        if (component && typeof component === 'object' && '$$filepath' in component) {
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
        
        return componentData;
    }
    
    return {
        components,
        globals,
        locale: locale || DEFAULT_LOCALE,
        getProps,
    };
}
