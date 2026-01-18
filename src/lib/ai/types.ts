export interface AIAction {
    action: 'update';
    componentId: string;
    componentName?: string;
    data: Record<string, any>;
}

export type MessageRole = 'user' | 'assistant';

// Persisted message model - only fields saved to storage
export interface Message {
    id: string;
    role: MessageRole;
    content: string;
    createdAt: number;
    actionData: AIAction | null;
    // Persist these so action feedback survives reload
    actionApplied?: boolean;
    previousData?: Record<string, any> | null;
    schemaName?: string | null;
}

// Runtime UI state - transient flags not persisted
export interface RuntimeMessageState {
    isStreaming?: boolean;
    hasAction?: boolean;
    parseError?: string | null;
}

// Composite type for UI usage - combines persisted + runtime state
export type UIMessage = Message & RuntimeMessageState;

export interface Conversation {
    id: string;
    title: string;
    updatedAt: number;
    createdAt: number;
}
