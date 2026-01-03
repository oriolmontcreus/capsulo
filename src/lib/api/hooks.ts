/**
 * TanStack Query hooks for CMS data
 * 
 * These hooks handle caching, background refetching, and deduplication automatically.
 * Integrates with IndexedDB cache for fast initial loads.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    fetchPages,
    fetchPageData,
    fetchGlobalData,
    fetchLatestCommitSha,
    refreshCache
} from './client';
import { getCachedCommitSha, invalidateCache, setCachedCommitSha } from '@/lib/cms-cache';
import type { PageInfo } from '@/lib/admin/types';
import type { PageData, GlobalData } from '@/lib/form-builder';
import { useCallback, useEffect } from 'react';

// Query key factories for consistent key management
export const queryKeys = {
    commitSha: ['commitSha'] as const,
    pages: ['pages'] as const,
    pageData: (pageId: string) => ['pageData', pageId] as const,
    globals: ['globals'] as const,
};

/**
 * Hook to fetch the latest commit SHA for cache validation.
 * This is a lightweight check to determine if cache is stale.
 * 
 * @returns Query result with latest commit SHA
 */
export function useLatestCommitSha() {
    const queryClient = useQueryClient();

    return useQuery<string | null, Error>({
        queryKey: queryKeys.commitSha,
        queryFn: async () => {
            const sha = await fetchLatestCommitSha();
            const cachedSha = await getCachedCommitSha();

            // If SHA changed, invalidate related queries
            if (sha && cachedSha && sha !== cachedSha) {
                await invalidateCache();
                await setCachedCommitSha(sha);

                // Invalidate TanStack Query cache for data queries
                queryClient.invalidateQueries({ queryKey: queryKeys.pages });
                queryClient.invalidateQueries({ queryKey: ['pageData'] });
                queryClient.invalidateQueries({ queryKey: queryKeys.globals });
            } else if (sha && !cachedSha) {
                await setCachedCommitSha(sha);
            }

            return sha;
        },
        staleTime: 1000 * 30, // Check every 30 seconds
        refetchInterval: 1000 * 60, // Refetch every minute in background
        refetchOnWindowFocus: true, // Check when user returns to tab
    });
}

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

/**
 * Hook that provides a function to manually refresh the cache
 * Useful after committing changes to ensure fresh data
 */
export function useRefreshCache() {
    const queryClient = useQueryClient();

    return useCallback(async () => {
        await refreshCache();

        // Invalidate all data queries
        await queryClient.invalidateQueries({ queryKey: queryKeys.commitSha });
        await queryClient.invalidateQueries({ queryKey: queryKeys.pages });
        await queryClient.invalidateQueries({ queryKey: ['pageData'] });
        await queryClient.invalidateQueries({ queryKey: queryKeys.globals });
    }, [queryClient]);
}

/**
 * Hook that sets up automatic cache validation on mount.
 * Should be used once at the top level of the admin app.
 */
export function useCacheValidation() {
    const { data: commitSha, isLoading } = useLatestCommitSha();

    // Return loading state and current SHA for potential UI indicators
    return {
        isValidating: isLoading,
        currentCommitSha: commitSha,
    };
}
