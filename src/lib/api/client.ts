/**
 * API Client for CMS data fetching
 * Typed fetch functions for use with TanStack Query
 */

import type { PageInfo } from '@/lib/admin/types';
import type { PageData, GlobalData } from '@/lib/form-builder';

const API_BASE = '/api/cms';

/**
 * Fetches list of available pages
 */
export async function fetchPages(): Promise<PageInfo[]> {
    const response = await fetch(`${API_BASE}/pages`);

    if (!response.ok) {
        throw new Error(`Failed to fetch pages: ${response.statusText}`);
    }

    const data = await response.json();
    return data.pages;
}

/**
 * Fetches data for a specific page
 */
export async function fetchPageData(pageId: string): Promise<PageData> {
    // Map 'home' to 'index' for API consistency
    const fileName = pageId === 'home' ? 'index' : pageId;

    const response = await fetch(`${API_BASE}/load?page=${encodeURIComponent(fileName)}`);

    if (!response.ok) {
        if (response.status === 404) {
            // Return empty page data if not found
            return { components: [] };
        }
        throw new Error(`Failed to fetch page data: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Fetches global variables data
 */
export async function fetchGlobalData(): Promise<GlobalData> {
    const response = await fetch(`${API_BASE}/globals/load`);

    if (!response.ok) {
        if (response.status === 404) {
            // Return empty globals if not found
            return { variables: [] };
        }
        throw new Error(`Failed to fetch global data: ${response.statusText}`);
    }

    return response.json();
}
