import * as React from "react";
import type { Message, UIMessage } from "@/lib/ai/types";
import { aiService } from "@/lib/ai/AIService";
import { chatStorage } from "@/lib/ai/chat-storage";
import { generateId } from "@/lib/utils/id-generation";
import { parseActionFromContent } from "../utils/actionParser";

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
}

export function useAIStreaming({
    currentConversationId,
    messages,
    setMessages,
    setStorageError,
    updateConversationTitle
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

    const handleSubmit = async (input: string, context: StreamingContext) => {
        if (!input.trim() || isStreaming || !currentConversationId) return;

        const conversationId = currentConversationId;
        const userMsg: Message = { 
            id: generateId(), 
            role: 'user', 
            content: input,
            createdAt: Date.now(),
            actionData: null
        };

        // Optimistic UI
        setMessages(prev => [...prev, userMsg]);
        setIsStreaming(true);

        // Save User Message
        try {
            await chatStorage.addMessage(conversationId, userMsg);
        } catch (e) {
            console.error("Failed to save user message", e);
            // We continue anyway so the user gets a response
        }

        const assistantMsgId = generateId();
        let currentContent = "";
        
        // Placeholder for stream
        setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: "", createdAt: Date.now(), actionData: null, isStreaming: true }]);

        try {
            const history = messages
                .map(m => ({ role: m.role, content: m.content }));
            
            const isFirstMessage = messages.length <= 1;

            await aiService.generateStream(
                { message: userMsg.content, context, history, isFirstMessage },
                {
                    onToken: (token) => {
                        if (!isMountedRef.current) return;
                        currentContent += token;
                        pendingContentRef.current = currentContent;
                        
                        // Throttle updates to ~100ms for better performance
                        const now = Date.now();
                        const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
                        
                        if (timeSinceLastUpdate >= 100) {
                            // Update immediately if enough time has passed
                            lastUpdateTimeRef.current = now;
                            setMessages(prev => prev.map(m => 
                                m.id === assistantMsgId ? { ...m, content: pendingContentRef.current } : m
                            ));
                        } else if (!throttleTimerRef.current) {
                            // Schedule an update if one isn't already scheduled
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
                    onComplete: async (fullText) => {
                        if (!isMountedRef.current) return;
                        
                        // Clear any pending throttled updates
                        if (throttleTimerRef.current) {
                            clearTimeout(throttleTimerRef.current);
                            throttleTimerRef.current = null;
                        }
                        
                        // Reset throttle state
                        pendingContentRef.current = "";
                        lastUpdateTimeRef.current = 0;
                        
                        // Handle Title Generation
                        let processedText = fullText;
                        const titleMatch = fullText.match(/<chat_title>(.*?)<\/chat_title>/);
                        if (titleMatch && titleMatch[1]) {
                            const newTitle = titleMatch[1].trim().substring(0, 40);
                            await updateConversationTitle(conversationId, newTitle);
                            processedText = fullText.replace(/<chat_title>.*?<\/chat_title>/s, '').trim();
                        }
                        
                        const { action: actionData, parseError } = parseActionFromContent(processedText);
                        const assistantMsg: Message = { 
                            id: assistantMsgId,
                            role: 'assistant',
                            content: processedText,
                            createdAt: Date.now(),
                            actionData: actionData
                        };

                        // Update UI state with runtime flags
                        setMessages(prev => prev.map(m => 
                             m.id === assistantMsgId ? { 
                                 ...assistantMsg, 
                                 hasAction: !!actionData, 
                                 isStreaming: false,
                                 parseError // Store parse error for UI feedback
                             } : m
                        ));
                        setIsStreaming(false);

                        // Save only persisted Message fields to storage
                        try {
                            await chatStorage.addMessage(conversationId, assistantMsg);
                        } catch (e) {
                            console.error("Failed to save assistant message", e);
                            if (isMountedRef.current) {
                                setStorageError("Failed to save message to history.");
                            }
                        }
                    },
                    onError: (error) => {
                        if (!isMountedRef.current) return;
                        
                        // Clear any pending throttled updates
                        if (throttleTimerRef.current) {
                            clearTimeout(throttleTimerRef.current);
                            throttleTimerRef.current = null;
                        }
                        
                        // Reset throttle state
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
