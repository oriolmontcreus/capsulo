/**
 * Zustand store for Admin UI state
 * 
 * Manages sidebar visibility, width, and resize state.
 * Persisted to localStorage for consistency across page loads.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminUIState {
    // Right sidebar state
    rightSidebarVisible: boolean;
    rightSidebarWidth: number;
    isResizing: boolean;

    // Actions
    toggleRightSidebar: () => void;
    setRightSidebarVisible: (visible: boolean) => void;
    setRightSidebarWidth: (width: number) => void;
    setIsResizing: (resizing: boolean) => void;
}

export const useAdminUI = create<AdminUIState>()(
    persist(
        (set) => ({
            rightSidebarVisible: true,
            rightSidebarWidth: 384, // 24rem
            isResizing: false,

            toggleRightSidebar: () => set((state) => ({
                rightSidebarVisible: !state.rightSidebarVisible
            })),
            setRightSidebarVisible: (visible) => set({ rightSidebarVisible: visible }),
            setRightSidebarWidth: (width) => set({ rightSidebarWidth: width }),
            setIsResizing: (resizing) => set({ isResizing: resizing }),
        }),
        {
            name: 'capsulo-admin-ui',
            partialize: (state) => ({
                rightSidebarVisible: state.rightSidebarVisible,
                rightSidebarWidth: state.rightSidebarWidth,
            }),
        }
    )
);
