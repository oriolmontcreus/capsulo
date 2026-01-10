import { usePageData, useGlobalData } from '../api/hooks';
import { useAdminNavigation } from '../stores';

export interface CMSContext {
    pageData: any; // Using any for flexibility, but mapped to PageData
    globalData: any; // Mapped to GlobalData
    selectedPage: string | null;
    isLoading: boolean;
}

/**
 * Hook to retrieve the full context needed for the AI Agent.
 * This includes the current page's content and global variables.
 */
export function useCMSContext(): CMSContext {
    const { selectedPage } = useAdminNavigation();
    
    const { data: pageData, isLoading: isLoadingPage } = usePageData(selectedPage || undefined);
    const { data: globalData, isLoading: isLoadingGlobals } = useGlobalData();

    return {
        pageData: pageData || null,
        globalData: globalData || null,
        selectedPage: selectedPage || null,
        isLoading: isLoadingPage || isLoadingGlobals
    };
}
