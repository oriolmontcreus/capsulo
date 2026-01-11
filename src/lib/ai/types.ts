export interface AIAction {
    action: 'update';
    componentId: string;
    data: Record<string, any>;
}

export type MessageRole = 'user' | 'assistant';

export interface Message {
    id: string;
    role: MessageRole;
    content: string;
    createdAt: number;
    isStreaming?: boolean;
    hasAction?: boolean;
    actionApplied?: boolean;
    actionData?: AIAction | null;
}

export interface Conversation {
    id: string;
    title: string;
    updatedAt: number;
    createdAt: number;
}
