import * as React from "react";
import type { UIMessage, Conversation } from "@/lib/ai/types";
import { chatStorage } from "@/lib/ai/chat-storage";
import { generateId } from "@/lib/utils/id-generation";

const createWelcomeMessage = (): UIMessage => ({
    id: 'welcome',
    role: 'assistant',
    content: "Hello! I'm your AI assistant. I can help you manage your content, translate fields, or rewrite valid standard JSON components. How can I help you today?",
    createdAt: Date.now(),
    actionData: null
});

export function useChatState() {
    const [isInitializing, setIsInitializing] = React.useState(true);
    const [messages, setMessages] = React.useState<UIMessage[]>([]);
    const [conversations, setConversations] = React.useState<Conversation[]>([]);
    const [currentConversationId, setCurrentConversationId] = React.useState<string | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
    const [storageError, setStorageError] = React.useState<string | null>(null);

    // Initialize chat storage and load conversations
    React.useEffect(() => {
        const init = async () => {
            try {
                await chatStorage.cleanupOldChats();
                const convs = await chatStorage.getConversations() as Conversation[];
                setConversations(convs.reverse()); // Newest first

                if (convs && convs.length > 0) {
                    // Load most recent
                    await loadConversation(convs[0].id);
                } else {
                    await createNewChat();
                }
            } catch (err) {
                console.error("Failed to initialize chat storage:", err);
                setStorageError("Chat history is unavailable (storage may be blocked or full).");
                setConversations([]);
                
                // Fallback: Show welcome message without a persistent conversation
                setCurrentConversationId('temp-fallback');
                setMessages([createWelcomeMessage()]);
            } finally {
                setIsInitializing(false);
            }
        };
        init();
    }, []);

    const createNewChat = async () => {
        const now = Date.now();
        let id = generateId('temp-');
        
        try {
            id = await chatStorage.createConversation("New Chat " + new Date().toLocaleTimeString());
            setConversations(prev => [{ id, title: "New Chat", updatedAt: now, createdAt: now }, ...prev]);
        } catch (err) {
            console.error("Failed to create conversation in storage:", err);
            setStorageError("Failed to save new chat to history.");
        }

        setCurrentConversationId(id);
        setMessages([createWelcomeMessage()]);
        setIsHistoryOpen(false);
    };

    const loadConversation = async (id: string) => {
        try {
            const msgs = await chatStorage.getMessages(id);
            setCurrentConversationId(id);
            if (!msgs || msgs.length === 0) {
                 setMessages([createWelcomeMessage()]);
            } else {
                // Sort by createdAt just in case
                setMessages(msgs.sort((a, b) => a.createdAt - b.createdAt));
            }
        } catch (err) {
            console.error("Failed to load conversation:", err);
            setStorageError("Failed to load chat history.");
            // If it's a temp ID or loading failed, we can still show a blank slate
            setCurrentConversationId(id);
            if (id.startsWith('temp-')) {
                setMessages([createWelcomeMessage()]);
            }
        }
        setIsHistoryOpen(false);
    };

    const deleteConversation = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();

        try {
            await chatStorage.deleteConversation(id);
            const remaining = conversations.filter(c => c.id !== id);
            setConversations(remaining);
            
            if (currentConversationId === id) {
                 if (remaining.length > 0) await loadConversation(remaining[0].id);
                 else await createNewChat();
            }
        } catch (err) {
            console.error("Failed to delete conversation:", err);
            setStorageError("Failed to delete chat from history.");
        }
    };

    const updateConversationTitle = async (id: string, title: string) => {
        try {
            await chatStorage.updateConversationTitle(id, title);
            setConversations(prev => prev.map(c => 
                c.id === id ? { ...c, title, updatedAt: Date.now() } : c
            ));
        } catch (err) {
            console.error("Failed to update conversation title:", err);
        }
    };

    return {
        messages,
        setMessages,
        conversations,
        currentConversationId,
        isHistoryOpen,
        setIsHistoryOpen,
        storageError,
        isInitializing,
        createNewChat,
        loadConversation,
        deleteConversation,
        updateConversationTitle
    };
}
