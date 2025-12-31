/**
 * Zustand store for Commit Flow state
 * 
 * Manages commit message and publishing state.
 * The actual publish logic will be implemented here to centralize it.
 */

import { create } from 'zustand';

interface CommitFlowState {
    commitMessage: string;
    isPublishing: boolean;
    isAutoSaving: boolean;
    lastCommitTimestamp: number;

    setCommitMessage: (msg: string) => void;
    setIsPublishing: (publishing: boolean) => void;
    setIsAutoSaving: (saving: boolean) => void;
    setLastCommitTimestamp: (timestamp: number) => void;
    clearCommitMessage: () => void;
}

export const useCommitFlow = create<CommitFlowState>((set) => ({
    commitMessage: '',
    isPublishing: false,
    isAutoSaving: false,
    lastCommitTimestamp: 0,

    setCommitMessage: (msg) => set({ commitMessage: msg }),
    setIsPublishing: (publishing) => set({ isPublishing: publishing }),
    setIsAutoSaving: (saving) => set({ isAutoSaving: saving }),
    setLastCommitTimestamp: (timestamp) => set({ lastCommitTimestamp: timestamp }),
    clearCommitMessage: () => set({ commitMessage: '' }),
}));
