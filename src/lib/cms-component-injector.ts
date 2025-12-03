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

/**
 * Analyzes a page's frontmatter to extract component imports and their schema keys
 * @param frontmatterContent - The frontmatter content (between --- markers)
 * @returns Map of component variable names to schema keys
 * 
 * @example
 * Input: "import Hero from '@/components/capsulo/hero/Hero.astro';"
 * Output: { Hero: 'hero' }
 */
export function analyzeComponentImports(frontmatterContent: string): Map<string, string> {
    const componentMap = new Map<string, string>();
    
    // Match import statements
    // Pattern: import [ComponentName] from '[path]';
    const importRegex = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(frontmatterContent)) !== null) {
        const componentName = match[1];
        const importPath = match[2];
        
        // Only process components from @/components/capsulo/
        if (importPath.includes('@/components/capsulo/')) {
            const schemaKey = getSchemaKeyFromImportPath(importPath);
            if (schemaKey) {
                componentMap.set(componentName, schemaKey);
            }
        }
    }
    
    return componentMap;
}

/**
 * Gets component props for a given component name based on CMS data
 * @param componentName - The component variable name (e.g., 'Hero')
 * @param componentMap - Map of component names to schema keys
 * @param cmsComponents - CMS components data object
 * @returns Component props object or empty object if not found
 */
export function getComponentProps(
    componentName: string,
    componentMap: Map<string, string>,
    cmsComponents: Record<string, Record<string, any>>
): Record<string, any> {
    const schemaKey = componentMap.get(componentName);
    if (!schemaKey) {
        return {};
    }
    
    return cmsComponents[schemaKey] || {};
}

