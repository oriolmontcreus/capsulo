/**
 * Zustand store for Global Search state
 * 
 * Manages search query and highlighted field for global variables view.
 */

import { create } from 'zustand';

interface GlobalSearchState {
    searchQuery: string;
    highlightedField: string | undefined;

    setSearchQuery: (query: string) => void;
    highlightField: (field: string) => void;
    clearHighlight: () => void;
}

export const useGlobalSearch = create<GlobalSearchState>((set) => ({
    searchQuery: '',
    highlightedField: undefined,

    setSearchQuery: (query) => set({ searchQuery: query }),
    highlightField: (field) => {
        // Reset first to force re-render, then set the value
        set({ highlightedField: undefined });
        setTimeout(() => set({ highlightedField: field }), 0);
    },
    clearHighlight: () => set({ highlightedField: undefined }),
}));
