/**
 * Zustand store for Admin Navigation state
 * 
 * Manages selectedPage and selectedCommit across the admin panel.
 * Eliminates prop drilling from AdminLayout -> SidebarWrapper -> AppSidebar.
 */

import { create } from 'zustand';

interface AdminNavigationState {
    selectedPage: string;
    selectedCommit: string | null;

    setSelectedPage: (pageId: string) => void;
    setSelectedCommit: (sha: string | null) => void;
}

export const useAdminNavigation = create<AdminNavigationState>((set) => ({
    selectedPage: '',
    selectedCommit: null,

    setSelectedPage: (pageId) => set({ selectedPage: pageId }),
    setSelectedCommit: (sha) => set({ selectedCommit: sha }),
}));
