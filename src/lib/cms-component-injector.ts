/**
 * CMS Component Injector
 * 
 * Analyzes component imports and matches them to schema keys for automatic prop injection.
 */

/**
 * Extracts schema key from component import path
 * @example '@/components/capsulo/hero/Hero.astro' -> 'hero'
 */
export function getSchemaKeyFromImportPath(importPath: string): string | null {
    // Match pattern: @/components/capsulo/[schemaKey]/[Component].astro
    const match = importPath.match(/@\/components\/capsulo\/([^\/]+)\//);
    return match ? match[1] : null;
}


