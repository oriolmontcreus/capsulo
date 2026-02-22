/**
 * CMS Component Injector
 * 
 * Analyzes component imports and matches them to schema keys for automatic prop injection.
 */

/**
 * Extracts schema key from component import path
 * @example '@/components/capsules/hero/Hero.astro' -> 'hero'
 */
export function getSchemaKeyFromImportPath(importPath: string): string | null {
    // Match pattern: @/components/capsules/[schemaKey]/[Component].astro
    const match = importPath.match(/@\/components\/capsules\/([^\/]+)\//);
    return match ? match[1] : null;
}


