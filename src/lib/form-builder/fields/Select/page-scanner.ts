/**
 * Page Scanner Utility for Internal Links
 * Scans available pages in the Astro project and generates options for the select field
 */

export interface PageInfo {
    path: string;
    locale?: string;
    displayName: string;
    description?: string; // File path or additional info
}

export interface InternalLinkOption {
    label: string;
    value: string;
    locale?: string;
    description?: string;
}

/**
 * Convert page file path to URL path
 * @example "/src/pages/about.astro" -> "/about"
 * @example "/src/pages/[locale]/contact.astro" -> "/contact"
 */
export function pagePathToUrl(filePath: string): string {
    let url = filePath
        .replace(/^.*\/pages\//, '/') // Remove everything up to and including /pages/
        .replace(/\.astro$/, '') // Remove .astro extension
        .replace(/\/index$/, '') // Remove /index
        .replace(/^\[locale\]\//, '/') // Remove [locale]/ from the start
        .replace(/\/\[locale\]\//, '/'); // Remove /[locale]/ from anywhere

    // If empty or just [locale], return /
    if (!url || url === '/[locale]' || url === '[locale]') {
        return '/';
    }

    return url;
}/**
 * Extract display name from file path
 * @example "/src/pages/about.astro" -> "About"
 * @example "/src/pages/blog/post-1.astro" -> "Blog / Post 1"
 */
export function getDisplayName(filePath: string): string {
    const urlPath = pagePathToUrl(filePath);

    if (urlPath === '/') return 'Home';

    return urlPath
        .split('/')
        .filter(Boolean)
        .map(segment => {
            // Convert kebab-case or snake_case to Title Case
            return segment
                .replace(/[-_]/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        })
        .join(' / ');
}

/**
 * Check if a page path should be excluded
 */
export function shouldExcludePage(filePath: string): boolean {
    // Exclude admin and api pages
    if (filePath.includes('/admin/') || filePath.includes('/api/')) {
        return true;
    }

    // Exclude dynamic routes with parameters other than [locale]
    const hasDynamicParams = /\[(?!locale\])[^\]]+\]/.test(filePath);
    if (hasDynamicParams) {
        return true;
    }

    return false;
}

/**
 * Generate select options from page info with locale resolution
 */
export function generatePageOptions(
    pages: PageInfo[],
    locales: string[],
    autoResolveLocale: boolean
): InternalLinkOption[] {
    if (autoResolveLocale) {
        // When auto-resolving, return one option per page (without locale prefix)
        // The actual URL will be resolved at runtime based on current locale
        return pages.map(page => ({
            label: page.displayName,
            value: page.path,
            description: page.description, // Include file path description
        }));
    } else {
        // When not auto-resolving, generate separate options for each locale
        const options: InternalLinkOption[] = [];

        for (const page of pages) {
            for (const locale of locales) {
                options.push({
                    label: `[${locale.toUpperCase()}] ${page.displayName}`,
                    value: `/${locale}${page.path}`,
                    locale,
                    description: page.description, // Include file path description
                });
            }
        }

        return options;
    }
}/**
 * Group pages by their top-level path
 */
export function groupPagesBySection(pages: PageInfo[]): Record<string, PageInfo[]> {
    const groups: Record<string, PageInfo[]> = {
        'Root': [],
    };

    for (const page of pages) {
        if (page.path === '/') {
            groups['Root'].push(page);
            continue;
        }

        const topLevel = page.path.split('/').filter(Boolean)[0];
        const groupName = topLevel
            ? topLevel.charAt(0).toUpperCase() + topLevel.slice(1).replace(/[-_]/g, ' ')
            : 'Root';

        if (!groups[groupName]) {
            groups[groupName] = [];
        }

        groups[groupName].push(page);
    }

    // Remove empty Root group if it exists
    if (groups['Root'].length === 0) {
        delete groups['Root'];
    }

    return groups;
}
