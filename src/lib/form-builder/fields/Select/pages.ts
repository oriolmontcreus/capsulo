/**
 * Available Pages using import.meta.glob
 * This file uses Vite's import.meta.glob to scan pages at build time
 */

import type { PageInfo } from './page-scanner';
import { pagePathToUrl, getDisplayName, shouldExcludePage } from './page-scanner';

const pageFiles = import.meta.glob('/src/pages/**/*.astro');

// Generate the pages list with file paths as descriptions
const pagesMap = new Map<string, { displayName: string; filePath: string }>();

for (const filePath of Object.keys(pageFiles)) {
    // Skip excluded pages (admin, api, dynamic routes)
    if (shouldExcludePage(filePath)) continue;

    const urlPath = pagePathToUrl(filePath);
    const displayName = getDisplayName(filePath);

    // Keep track of the first occurrence for each URL path
    if (!pagesMap.has(urlPath)) {
        pagesMap.set(urlPath, { displayName, filePath });
    }
}

// Convert map to array with descriptions
const pages: PageInfo[] = Array.from(pagesMap.entries()).map(([urlPath, { displayName, filePath }]) => {
    const relativePath = filePath
        .replace(/^\/src\/pages\//, '')
        .replace(/\.astro$/, '');

    return {
        path: urlPath,
        displayName,
        description: relativePath,
    };
});
export const AVAILABLE_PAGES = pages;
