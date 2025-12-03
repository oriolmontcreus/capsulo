/**
 * CMS Context
 * 
 * Provides a way for components to access CMS data automatically.
 * Components can use this to read their data if props are not provided.
 */

// Global CMS context (set by layout)
let cmsContext: {
    components: Record<string, Record<string, any>>;
    globals: Record<string, any> | null;
    locale: string;
} | null = null;

/**
 * Sets the CMS context (called by layout)
 */
export function setCMSContext(context: {
    components: Record<string, Record<string, any>>;
    globals: Record<string, any> | null;
    locale: string;
}) {
    cmsContext = context;
}

/**
 * Gets the CMS context
 * Exported for use in transformed page files
 */
export function getCMSContext() {
    return cmsContext;
}

/**
 * Gets CMS context with fallback (for use in transformed pages)
 */
export function getCMSContextWithFallback() {
    return cmsContext || { components: {}, globals: null, locale: 'en' };
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

