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


