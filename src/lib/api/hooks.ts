/**
 * TanStack Query hooks for CMS data
 * 
 * These hooks handle caching, background refetching, and deduplication automatically.
 */

import { useQuery } from '@tanstack/react-query';
import { fetchPages, fetchPageData, fetchGlobalData } from './client';
import type { PageInfo } from '@/lib/admin/types';
import type { PageData, GlobalData } from '@/lib/form-builder';

// Query key factories for consistent key management
export const queryKeys = {
    pages: ['pages'] as const,
    pageData: (pageId: string) => ['pageData', pageId] as const,
    globals: ['globals'] as const,
};

/**
 * Hook to fetch list of available pages
 * 
 * @returns Query result with pages array
 */
export function usePages() {
    return useQuery<PageInfo[], Error>({
        queryKey: queryKeys.pages,
        queryFn: fetchPages,
        staleTime: 1000 * 60 * 10, // 10 minutes - page list rarely changes
    });
}

/**
 * Hook to fetch data for a specific page
 * 
 * @param pageId - The page ID to fetch data for
 * @returns Query result with page data
 */
export function usePageData(pageId: string | undefined) {
    return useQuery<PageData, Error>({
        queryKey: queryKeys.pageData(pageId ?? ''),
        queryFn: () => fetchPageData(pageId!),
        enabled: !!pageId, // Only fetch when pageId is provided
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

/**
 * Hook to fetch global variables data
 * 
 * @returns Query result with global data
 */
export function useGlobalData() {
    return useQuery<GlobalData, Error>({
        queryKey: queryKeys.globals,
        queryFn: fetchGlobalData,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}
