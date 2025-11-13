/**
 * Auto-resolve internal links with locale
 * 
 * This utility automatically resolves internal links in component data
 * based on the current locale, so you don't have to manually handle it everywhere.
 */

interface FieldData {
    type: string;
    translatable: boolean;
    value?: any;
    _internalLink?: boolean; // Marker for internal links
}

interface ComponentData {
    [key: string]: FieldData;
}

/**
 * Resolve internal links in component data
 * 
 * @param data - Component data from JSON
 * @param locale - Current locale (e.g., 'en', 'es', 'fr')
 * @returns Data with resolved internal links
 * 
 * @example
 * const resolvedData = resolveInternalLinks(componentData, currentLocale);
 * <Hero {...resolvedData} />
 */
export function resolveInternalLinks(data: ComponentData, locale: string): Record<string, any> {
    const resolved: Record<string, any> = {};

    for (const [key, field] of Object.entries(data)) {
        if (!field) continue;

        // Handle translatable fields
        if (field.translatable && field.value && typeof field.value === 'object') {
            resolved[key] = field.value[locale] || field.value[Object.keys(field.value)[0]];
        }
        // Handle internal links - automatically prepend locale
        else if (field._internalLink && field.value) {
            resolved[key] = `/${locale}${field.value}`;
        }
        // Regular fields
        else {
            resolved[key] = field.value;
        }
    }

    return resolved;
}

/**
 * Simpler version that just resolves a path if it's an internal link
 */
export function resolveLink(path: string | undefined, locale: string, isInternal: boolean = true): string {
    if (!path) return '';
    if (!isInternal) return path;
    return `/${locale}${path}`;
}
