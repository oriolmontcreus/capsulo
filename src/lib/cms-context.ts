/**
 * CMS Context
 * 
 * Provides a way for components to access CMS data automatically.
 * Components can use this to read their data if props are not provided.
 */

import { DEFAULT_LOCALE } from './i18n-utils';

type CMSContext = {
    components: Record<string, Record<string, any>>;
    globals: Record<string, any> | null;
    locale: string;
};

// Global CMS context (set by layout)
let cmsContext: CMSContext | null = null;

/**
 * Sets the CMS context (called by layout)
 */
export function setCMSContext(context: CMSContext) {
    cmsContext = context;
}

/**
 * Gets the CMS context
 * Exported for use in transformed page files
 */
export function getCMSContext(): CMSContext | null {
    return cmsContext;
}



/**
 * Gets global variables from CMS context
 * 
 * @example
 * ```astro
 * ---
 * import { getGlobalsFromContext } from '@/lib/cms-context';
 * import type { GlobalsSchemaData } from '@/config/globals/globals.schema.d';
 * 
 * const globals = getGlobalsFromContext<GlobalsSchemaData>();
 * const siteName = globals?.siteName; // Properly typed!
 * ---
 * ```
 */
export function getGlobalsFromContext<T = Record<string, any>>(): T | null {
    if (!cmsContext) {
        return null;
    }

    return cmsContext.globals as T | null;
}

