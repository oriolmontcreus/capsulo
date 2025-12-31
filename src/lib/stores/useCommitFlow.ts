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
    lastCommitTimestamp: number;

    setCommitMessage: (msg: string) => void;
    setIsPublishing: (publishing: boolean) => void;
    setLastCommitTimestamp: (timestamp: number) => void;
    clearCommitMessage: () => void;
}

export const useCommitFlow = create<CommitFlowState>((set) => ({
    commitMessage: '',
    isPublishing: false,
    lastCommitTimestamp: 0,

    setCommitMessage: (msg) => set({ commitMessage: msg }),
    setIsPublishing: (publishing) => set({ isPublishing: publishing }),
    setLastCommitTimestamp: (timestamp) => set({ lastCommitTimestamp: timestamp }),
    clearCommitMessage: () => set({ commitMessage: '' }),
}));
