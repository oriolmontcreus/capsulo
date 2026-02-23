/**
 * Automatic CMS Integration
 * 
 * This utility automatically loads CMS data for pages and provides simplified access.
 * Pages just need to call getPageCMS() once, and all data is available.
 */

import type { AstroGlobal } from 'astro';
import { loadPageData, getAllComponentsData, getGlobalVar } from './cms-loader';
import { isValidLocale, DEFAULT_LOCALE, LOCALES, getLocaleFromPathname } from './i18n-utils';

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
    // Try to get locale from pathname first via shared helper
    let locale = getLocaleFromPathname(astro.url.pathname);

    // Check if pathname actually contained a locale (not just default)
    const pathnameSegments = astro.url.pathname.split('/').filter(Boolean);
    const firstSegment = pathnameSegments[0];
    const hasPathnameLocale = firstSegment && isValidLocale(firstSegment);

    // Fallback: if pathname doesn't contain a valid locale, try params
    if (!hasPathnameLocale && astro.params && astro.params.locale) {
        const fromParams = astro.params.locale as string;
        if (isValidLocale(fromParams)) {
            locale = fromParams;
        } else {
            // Invalid locale in params
            return undefined;
        }
    } else if (!hasPathnameLocale) {
        // No locale in pathname and no params
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
 * import Hero from '@/components/capsules/hero/Hero.astro';
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
        locale
    };
}
