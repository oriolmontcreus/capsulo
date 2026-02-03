import { usePageData, useGlobalData } from '../api/hooks';
import { useAdminNavigation } from '../stores';
import type { PageData, GlobalData } from '../form-builder';

export interface CMSContext {
    pageData: PageData | null;
    globalData: GlobalData | null;
    selectedPage: string | null;
    isLoading: boolean;
    error: Error | null;
}

/**
 * Hook to retrieve the full context needed for the AI Agent.
 * This includes the current page's content and global variables.
 */
export function useCMSContext(): CMSContext {
    const { selectedPage } = useAdminNavigation();
    
    const { data: pageData, isLoading: isLoadingPage, error: pageError } = usePageData(selectedPage || undefined);
    const { data: globalData, isLoading: isLoadingGlobals, error: globalError } = useGlobalData();

    return {
        pageData: pageData || null,
        globalData: globalData || null,
        selectedPage: selectedPage || null,
        isLoading: isLoadingPage || isLoadingGlobals,
        error: pageError || globalError || null
    };
}
