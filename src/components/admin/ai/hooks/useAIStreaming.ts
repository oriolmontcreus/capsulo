import * as React from "react";
import type { Message, UIMessage, Attachment } from "@/lib/ai/types";
import { aiService } from "@/lib/ai/AIService";
import { chatStorage } from "@/lib/ai/chat-storage";
import { generateId } from "@/lib/utils/id-generation";

interface StreamingContext {
    page: { id: string | null; data: any };
    globals: any;
}

interface UseAIStreamingOptions {
    currentConversationId: string | null;
    messages: UIMessage[];
    setMessages: React.Dispatch<React.SetStateAction<UIMessage[]>>;
    setStorageError: React.Dispatch<React.SetStateAction<string | null>>;
    updateConversationTitle: (id: string, title: string) => Promise<void>;
    /** Callback to auto-apply action when streaming completes with an action */
    onAutoApplyAction?: (messageId: string, actionData: any, setMessages: React.Dispatch<React.SetStateAction<UIMessage[]>>) => Promise<void> | void;
}

export function useAIStreaming({
    currentConversationId,
    messages,
    setMessages,
    setStorageError,
    updateConversationTitle,
    onAutoApplyAction
}: UseAIStreamingOptions) {
    const [isStreaming, setIsStreaming] = React.useState(false);
    
    // Mounted ref to prevent state updates after unmount
    const isMountedRef = React.useRef(true);
    
    // Throttling refs for streaming performance
    const throttleTimerRef = React.useRef<NodeJS.Timeout | null>(null);
    const pendingContentRef = React.useRef<string>("");
    const lastUpdateTimeRef = React.useRef<number>(0);
    
    // Cleanup on unmount
    React.useEffect(() => {
        return () => {
            isMountedRef.current = false;
            if (throttleTimerRef.current) {
                clearTimeout(throttleTimerRef.current);
            }
        };
    }, []);

    const handleSubmit = async (input: string, context: StreamingContext, attachments?: Attachment[]) => {
        if (!input.trim() || isStreaming || !currentConversationId) return;

        const conversationId = currentConversationId;
        const userMsg: Message = { 
            id: generateId(), 
            role: 'user', 
            content: input,
            createdAt: Date.now(),
            actionData: null,
            attachments: attachments
        };

        // Optimistic UI
        setMessages(prev => [...prev, userMsg]);
        setIsStreaming(true);

        // Save User Message
        try {
            await chatStorage.addMessage(conversationId, userMsg);
        } catch (e) {
            console.error("Failed to save user message", e);
        }

        const assistantMsgId = generateId();
        let currentContent = "";
        let currentActionData: any = null;
        
        // Placeholder for stream
        setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: "", createdAt: Date.now(), actionData: null, isStreaming: true }]);

        try {
            const history = messages
                .map(m => ({ role: m.role, content: m.content }));
            
            const isFirstMessage = messages.length <= 1;

            await aiService.generateStream(
                { message: userMsg.content, context, history, isFirstMessage, attachments },
                {
                    onToken: (token) => {
                        if (!isMountedRef.current) return;
                        currentContent += token;
                        pendingContentRef.current = currentContent;
                        
                        const now = Date.now();
                        const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
                        
                        if (timeSinceLastUpdate >= 100) {
                            lastUpdateTimeRef.current = now;
                            setMessages(prev => prev.map(m => 
                                m.id === assistantMsgId ? { ...m, content: pendingContentRef.current } : m
                            ));
                        } else if (!throttleTimerRef.current) {
                            throttleTimerRef.current = setTimeout(() => {
                                if (!isMountedRef.current) return;
                                lastUpdateTimeRef.current = Date.now();
                                setMessages(prev => prev.map(m => 
                                    m.id === assistantMsgId ? { ...m, content: pendingContentRef.current } : m
                                ));
                                throttleTimerRef.current = null;
                            }, 100 - timeSinceLastUpdate);
                        }
                    },
                    onAction: (action) => {
                        console.log("[useAIStreaming] Received action via tool call:", action);
                        currentActionData = action;
                    },
                    onTitle: async (title) => {
                        console.log("[useAIStreaming] Received title via tool call:", title);
                        if (title) {
                            await updateConversationTitle(conversationId, title);
                        }
                    },
                    onComplete: async (fullText) => {
                        if (!isMountedRef.current) return;
                        
                        if (throttleTimerRef.current) {
                            clearTimeout(throttleTimerRef.current);
                            throttleTimerRef.current = null;
                        }
                        
                        pendingContentRef.current = "";
                        lastUpdateTimeRef.current = 0;
                        
                        const assistantMsg: Message = { 
                            id: assistantMsgId,
                            role: 'assistant',
                            content: fullText,
                            createdAt: Date.now(),
                            actionData: currentActionData
                        };

                        setMessages(prev => prev.map(m => 
                             m.id === assistantMsgId ? { 
                                 ...assistantMsg, 
                                 hasAction: !!currentActionData,
                                 isStreaming: false
                             } : m
                        ));
                        setIsStreaming(false);

                        const persistAssistantMessage = async () => {
                            try {
                                await chatStorage.addMessage(conversationId, assistantMsg);
                            } catch (e) {
                                console.error("Failed to save assistant message", e);
                                if (isMountedRef.current) {
                                    setStorageError("Failed to save message to history.");
                                }
                            }
                        };

                        if (currentActionData && onAutoApplyAction) {
                            try {
                                await onAutoApplyAction(assistantMsgId, currentActionData, setMessages);
                            } catch (error) {
                                console.error('[useAIStreaming] Auto-apply failed, falling back to basic persistence:', error);
                                await persistAssistantMessage();
                            }
                        } else {
                            await persistAssistantMessage();
                        }
                    },
                    onError: (error) => {
                        if (!isMountedRef.current) return;
                        
                        if (throttleTimerRef.current) {
                            clearTimeout(throttleTimerRef.current);
                            throttleTimerRef.current = null;
                        }
                        
                        pendingContentRef.current = "";
                        lastUpdateTimeRef.current = 0;
                        
                        setMessages(prev => prev.map(m => 
                            m.id === assistantMsgId ? { 
                                ...m, 
                                content: currentContent + `\n\n**Error:** ${error.message}`, 
                                isStreaming: false 
                            } : m
                        ));
                        setIsStreaming(false);
                    }
                }
            );
        } catch (error: any) {
            if (isMountedRef.current) {
                setIsStreaming(false);
            }
        }
    };

    return {
        isStreaming,
        handleSubmit
    };
}
