/**
 * CMS Component Utilities
 * 
 * Utilities for components to automatically get their CMS data based on their file path.
 */

import { getCMSContext } from './cms-context';
import { getSchemaKeyFromImportPath } from './cms-component-injector';

/**
 * Gets CMS props for a component based on its file path
 * Components can call this to automatically get their CMS data
 * 
 * @param componentFilePath - The file path of the component (from import.meta.url or Astro)
 * @returns Component props object from CMS, or empty object if not found
 * 
 * @example
 * ```astro
 * ---
 * import { getCMSProps } from '@/lib/cms-component-utils';
 * import type { HeroSchemaData } from './hero.schema.d';
 * 
 * const props = getCMSProps<HeroSchemaData>(import.meta.url);
 * const { title, subtitle } = { ...props, ...Astro.props }; // Merge with manual props
 * ---
 * ```
 */
export function getCMSProps<T = Record<string, any>>(componentFilePath: string): T {
    const cmsData = getCMSContext();
    if (!cmsData) {
        return {} as T;
    }

    // Extract schema key from file path
    // import.meta.url gives us a file:// URL, we need to convert it to a path
    // Also handle both absolute paths and paths relative to project root
    let normalizedPath = componentFilePath;

    // If it's a file:// URL, extract the path
    if (normalizedPath.startsWith('file://')) {
        normalizedPath = normalizedPath.replace('file://', '');
        // Remove leading slash on Windows (file:///C:/path -> C:/path)
        if (normalizedPath.startsWith('/') && /^[A-Za-z]:/.test(normalizedPath.slice(1))) {
            normalizedPath = normalizedPath.slice(1);
        }
    }

    // Convert to forward slashes and normalize
    normalizedPath = normalizedPath.replace(/\\/g, '/');

    // Extract schema key - look for @/components/capsulo/[schemaKey]/ pattern
    const schemaKey = getSchemaKeyFromImportPath(normalizedPath);
    if (!schemaKey) {
        // Try alternative: look for /components/capsulo/[schemaKey]/ in the path
        const altMatch = normalizedPath.match(/\/components\/capsulo\/([^\/]+)\//);
        if (altMatch) {
            const altSchemaKey = altMatch[1];
            return (cmsData.components?.[altSchemaKey] || {}) as T;
        }
        return {} as T;
    }

    // Get component data from CMS
    return (cmsData.components?.[schemaKey] || {}) as T;
}

/**
 * Gets CMS props and merges with provided props
 * Useful for components that want to use CMS data but allow manual overrides
 * 
 * @param componentFilePath - The file path of the component
 * @param manualProps - Manual props to merge (takes precedence over CMS props)
 * @returns Merged props object with proper typing
 * 
 * @example
 * ```astro
 * ---
 * import { getCMSPropsWithDefaults } from '@/lib/cms-component-utils';
 * import type { HeroSchemaData } from './hero.schema.d';
 * 
 * const cmsProps = getCMSPropsWithDefaults<HeroSchemaData>(import.meta.url, Astro.props);
 * const { title, subtitle } = cmsProps; // Properly typed!
 * ---
 * ```
 */
export function getCMSPropsWithDefaults<T = Record<string, any>>(
    componentFilePath: string,
    manualProps: Partial<T> = {}
): T {
    const cmsProps = getCMSProps<T>(componentFilePath);
    return { ...cmsProps, ...manualProps } as T;
}

