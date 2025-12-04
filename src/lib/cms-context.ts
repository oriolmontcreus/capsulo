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
 * Gets CMS context with fallback (for use in transformed pages)
 */
export function getCMSContextWithFallback(): CMSContext {
    return cmsContext ?? { components: {}, globals: null, locale: DEFAULT_LOCALE };
}

/**
 * Gets component props from CMS context based on schema key
 */
export function getComponentPropsFromContext(schemaKey: string): Record<string, any> {
    if (!cmsContext) {
        return {};
    }
    
    return cmsContext.components[schemaKey] || {};
}

/**
 * Gets global variables from CMS context
 */
export function getGlobalsFromContext(): Record<string, any> | null {
    if (!cmsContext) {
        return null;
    }
    
    return cmsContext.globals;
}

