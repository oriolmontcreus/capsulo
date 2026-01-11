import * as React from "react";
import { Send, Sparkles, User, Bot, Check, AlertCircle, Trash2, Plus, MessageSquare, SquarePen, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { useCMSContext } from "@/lib/ai/useCMSContext";
import { aiService } from "@/lib/ai/AIService";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import { chatStorage } from "@/lib/ai/chat-storage";
import { useTranslation } from "@/lib/form-builder/context/TranslationContext";
import type { Message, UIMessage, Conversation, AIAction } from "@/lib/ai/types";
import { generateId } from "@/lib/utils/id-generation";

interface ChatInterfaceProps {
    onViewChange?: (view: 'content' | 'globals' | 'changes' | 'history') => void;
}

export function ChatInterface({ onViewChange }: ChatInterfaceProps) {
    const { pageData, globalData, selectedPage, error: cmsError, isLoading: isLoadingCMS } = useCMSContext();
    const [messages, setMessages] = React.useState<UIMessage[]>([]);
    const [conversations, setConversations] = React.useState<Conversation[]>([]);
    const [currentConversationId, setCurrentConversationId] = React.useState<string | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
    
    const [input, setInput] = React.useState("");
    const [isStreaming, setIsStreaming] = React.useState(false);
    const [storageError, setStorageError] = React.useState<string | null>(null);
    
    // Mounted ref to prevent state updates after unmount
    const isMountedRef = React.useRef(true);
    const abortControllerRef = React.useRef<AbortController | null>(null);
    
    // Throttling refs for streaming performance
    const throttleTimerRef = React.useRef<NodeJS.Timeout | null>(null);
    const pendingContentRef = React.useRef<string>("");
    const lastUpdateTimeRef = React.useRef<number>(0);
    
    // Cleanup on unmount
    React.useEffect(() => {
        return () => {
            isMountedRef.current = false;
            abortControllerRef.current?.abort();
            if (throttleTimerRef.current) {
                clearTimeout(throttleTimerRef.current);
            }
        };
    }, []);
    
    // Initial Load & Cleanup
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
                setMessages([{
                    id: 'welcome',
                    role: 'assistant',
                    content: "Hello! I'm your AI assistant. I can help you manage your content, translate fields, or rewrite valid standard JSON components. How can I help you today?",
                    createdAt: Date.now(),
                    actionData: null
                }]);
            }
        };
        init();
    }, []);

    const createNewChat = async () => {
        if (isStreaming) return;
        
        // Abort any ongoing stream
        abortControllerRef.current?.abort();
        
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
        setMessages([{
             id: 'welcome',
             role: 'assistant',
             content: "Hello! I'm your AI assistant. I can help you manage your content, translate fields, or rewrite valid standard JSON components. How can I help you today?",
             createdAt: Date.now(),
             actionData: null
        }]);
        setIsHistoryOpen(false);
    };

    const loadConversation = async (id: string) => {
        if (isStreaming) return;
        
        // Abort any ongoing stream
        abortControllerRef.current?.abort();
        
        try {
            const msgs = await chatStorage.getMessages(id);
            setCurrentConversationId(id);
            if (!msgs || msgs.length === 0) {
                 setMessages([{
                     id: 'welcome',
                     role: 'assistant',
                     content: "Hello! I'm your AI assistant. I can help you manage your content, translate fields, or rewrite valid standard JSON components. How can I help you today?",
                     createdAt: Date.now(),
                     actionData: null
                }]);
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
                setMessages([{
                    id: 'welcome',
                    role: 'assistant',
                    content: "Hello! I'm your AI assistant. I can help you manage your content, translate fields, or rewrite valid standard JSON components. How can I help you today?",
                    createdAt: Date.now(),
                    actionData: null
                }]);
            }
        }
        setIsHistoryOpen(false);
    };

    const deleteConversation = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (isStreaming) return;

        try {
            await chatStorage.deleteConversation(id);
            const remaining = conversations.filter(c => c.id !== id);
            setConversations(remaining);
            
            if (currentConversationId === id) {
                 if (remaining.length > 0) loadConversation(remaining[0].id);
                 else createNewChat();
            }
        } catch (err) {
            console.error("Failed to delete conversation:", err);
            setStorageError("Failed to delete chat from history.");
        }
    };

    // Ref for the chat scroll area
    const scrollAreaRef = React.useRef<HTMLDivElement>(null);

    // Auto-scroll logic - target only the chat's scroll area
    React.useEffect(() => {
        const scrollArea = scrollAreaRef.current;
        if (scrollArea) {
            // Find the viewport within our specific ScrollArea ref
            const viewport = scrollArea.querySelector('[data-radix-scroll-area-viewport]');
            if (viewport) {
                viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
            }
        }
    }, [messages, isStreaming]);

    const { defaultLocale } = useTranslation();

    const handleApplyAction = React.useCallback(async (messageId: string, actionData: AIAction) => {
        if (!actionData || !actionData.componentId || !actionData.data) return;

        // Sanitize data: 
        // 1. If AI sends { type: "...", value: "..." }, extract "value".
        // 2. If AI sends { "en": "...", "es": "..." } (translation object) for a field that might be string-only in current view,
        //    we should probably resolve it to the specific locale string if we are in "content editing" mode which usually defaults to default locale.
        const sanitizedData: Record<string, any> = {};
        
        const forbiddenKeys = new Set(['__proto__', 'prototype', 'constructor']);
        Object.entries(actionData.data).forEach(([key, value]: [string, any]) => {
            if (forbiddenKeys.has(key)) return;
            let cleanValue = value;

            // Unwrap internal structure
            if (value && typeof value === 'object' && 'value' in value && 'type' in value) {
                cleanValue = value.value;
            }

            // Unwrap translation object if incorrectly sent as object
            // Validate that keys are real locale codes (e.g., 'en', 'es', 'en-US', 'pt-BR')
            // and values are strings (expected translation shape)
            if (cleanValue && typeof cleanValue === 'object' && !Array.isArray(cleanValue)) {
                const keys = Object.keys(cleanValue);
                // Locale pattern: 2-letter language code, optionally followed by dash and 2+ letter region
                const localePattern = /^[a-z]{2}(-[A-Z]{2,})?$/;
                const allKeysAreLocales = keys.length > 0 && keys.every(k => localePattern.test(k));
                const hasStringValue = keys.some(k => typeof cleanValue[k] === 'string');
                
                if (allKeysAreLocales && hasStringValue) {
                    // Pick default locale or first available
                    cleanValue = cleanValue[defaultLocale] || cleanValue[keys[0]];
                }
            }

            sanitizedData[key] = cleanValue;
        });

        window.dispatchEvent(new CustomEvent('cms-ai-update-component', {
            detail: {
                componentId: actionData.componentId,
                data: sanitizedData
            }
        }));

        setMessages(prev => prev.map(m => 
            m.id === messageId ? { ...m, actionApplied: true } : m
        ));
    }, [defaultLocale]);

    const parseActionFromContent = (content: string): AIAction | null => {
        // Support wrapped <cms-edit> ... </cms-edit> (Preferred)
        const xmlRegex = /<cms-edit>\s*([\s\S]*?)\s*<\/cms-edit>/;
        const xmlMatch = content.match(xmlRegex);
        if (xmlMatch && xmlMatch[1]) {
            try { return JSON.parse(xmlMatch[1].trim()); } catch (e) { console.error("Failed to parse AI action XML/JSON", e); }
        }

        // Fallback to markdown code block
        const jsonBlockRegex = /```json\s*([\s\S]*?"action"\s*:\s*"update"[\s\S]*?)\s*```/;
        const match = content.match(jsonBlockRegex);
        if (match && match[1]) {
            try { return JSON.parse(match[1].trim()); } catch (e) { console.error("Failed to parse AI action JSON", e); }
        }
        return null;
    };

    const stripActionBlock = (content: string) => {
        // Removes the JSON/XML action block for display
        return content
            .replace(/<cms-edit>[\s\S]*?<\/cms-edit>/g, '')
            .replace(/```json\s*[\s\S]*?"action"\s*:\s*"update"[\s\S]*?\s*```/g, '')
            .trim();
    };

    const handleSubmit = async () => {
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
        setInput("");
        setIsStreaming(true);

        // Create new AbortController for this request
        abortControllerRef.current = new AbortController();

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
            const context = {
                page: { id: selectedPage, data: pageData },
                globals: globalData
            };
            
            const history = messages
                .map(m => ({ role: m.role, content: m.content }));

            await aiService.generateStream(
                { message: userMsg.content, context, history },
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
                        
                        const actionData = parseActionFromContent(fullText);
                        const assistantMsg: Message = { 
                            id: assistantMsgId,
                            role: 'assistant',
                            content: fullText,
                            createdAt: Date.now(),
                            actionData: actionData
                        };

                        // Update UI state with runtime flags
                        setMessages(prev => prev.map(m => 
                             m.id === assistantMsgId ? { ...assistantMsg, hasAction: !!actionData, isStreaming: false } : m
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

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="flex flex-col h-full bg-background relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center px-4 py-3 border-b bg-muted/30 shrink-0 h-[41px]">
                <Button variant="ghost" size="icon" className="w-6 h-6 mr-2" onClick={() => setIsHistoryOpen(!isHistoryOpen)}>
                    <MessageSquare className="w-4 h-4" />
                </Button>
                <div className="flex-1 min-w-0">
                     <h3 className="text-sm font-medium truncate">
                         {conversations.find(c => c.id === currentConversationId)?.title || "New Chat"}
                     </h3>
                </div>
                <Button variant="ghost" size="icon" className="w-6 h-6 ml-2 text-muted-foreground hover:text-foreground" onClick={createNewChat} title="New Chat" disabled={isStreaming}>
                    <SquarePen className="w-4 h-4" />
                </Button>
            </div>

            {/* Context Status */}
            {cmsError && (
                <div className="px-4 py-1.5 bg-destructive/10 border-b border-destructive/20 flex items-center gap-2 text-[10px] text-destructive animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span className="truncate flex-1">CMS Context Error: {cmsError.message}</span>
                </div>
            )}
            {storageError && (
                <div className="px-4 py-1.5 bg-yellow-500/10 border-b border-yellow-500/20 flex items-center gap-2 text-[10px] text-yellow-600 dark:text-yellow-400 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span className="truncate flex-1">{storageError}</span>
                </div>
            )}
            {!cmsError && isLoadingCMS && !pageData && (
                 <div className="px-4 py-1.5 bg-muted/30 border-b border-muted/20 flex items-center gap-2 text-[10px] text-muted-foreground animate-in fade-in">
                    <Spinner className="w-3 h-3 shrink-0" />
                    <span className="truncate">Loading site context...</span>
                </div>
            )}

            {/* History Overlay */}
            {isHistoryOpen && (
                <div className="absolute top-[41px] left-0 w-full h-[calc(100%-41px)] bg-background/95 backdrop-blur-sm z-50 flex flex-col p-4 border-r animate-in slide-in-from-left-2 duration-200">
                     <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Recent Chats</h4>
                     <ScrollArea className="flex-1 -mx-2 px-2">
                         <div className="space-y-1">
                             {conversations.map(c => (
                                 <div 
                                     key={c.id} 
                                     onClick={() => loadConversation(c.id)}
                                     className={cn(
                                         "flex items-center justify-between p-2 rounded-md text-sm cursor-pointer hover:bg-accent group",
                                         currentConversationId === c.id ? "bg-accent/80 font-medium" : "",
                                         isStreaming && "opacity-50 pointer-events-none"
                                     )}
                                 >
                                     <span className="truncate flex-1 pr-2">{c.title}</span>
                                     <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        onClick={(e) => deleteConversation(e, c.id)}
                                        disabled={isStreaming}
                                     >
                                         <Trash2 className="w-3 h-3" />
                                     </Button>
                                 </div>
                             ))}
                         </div>
                     </ScrollArea>
                </div>
            )}

            {/* Messages Area */}
            <ScrollArea ref={scrollAreaRef} className="flex-1 w-full bg-background overflow-y-auto">
                    {messages.map((msg, index) => (
                        <div 
                            key={msg.id} 
                            className={cn(
                                "flex flex-col gap-1 max-w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
                                msg.role === 'user' ? "items-end" : "items-start"
                            )}
                            style={{
                                animationDelay: `${Math.min(index * 50, 300)}ms`,
                                animationFillMode: 'backwards'
                            }}
                        >
                            <div className={cn(
                                "max-w-[90%] px-3 py-2 rounded-lg text-sm overflow-hidden",
                                msg.role === 'user' 
                                    ? "bg-primary text-primary-foreground rounded-tr-none" 
                                    : "bg-muted rounded-tl-none prose prose-sm dark:prose-invert max-w-none"
                            )}>
                                {msg.role === 'user' ? (
                                    <div className="whitespace-pre-wrap">{msg.content}</div>
                                ) : (
                                    <>
                                        <ReactMarkdown 
                                            components={{
                                                pre: ({node, ...props}) => (
                                                    <div className="overflow-auto w-full my-2 bg-background/50 p-2 rounded border">
                                                        <pre {...props} />
                                                    </div>
                                                ),
                                                code: ({node, ...props}) => <code className="bg-background/50 px-1 py-0.5 rounded font-mono text-xs" {...props} />
                                            }}
                                        >
                                            {stripActionBlock(msg.content)}
                                        </ReactMarkdown>
                                        {msg.isStreaming && msg.content && (
                                            <span className="inline-block w-1.5 h-4 bg-foreground/70 ml-0.5 animate-pulse" />
                                        )}
                                    </>
                                )}
                            </div>
                            
                            {/* Action Feedback */}
                            {msg.hasAction && (
                                <div className="flex items-center gap-2 mt-1 ml-1 animate-in fade-in slide-in-from-left-1 duration-200">
                                    {msg.actionApplied ? (
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                                                <Check className="w-3 h-3" />
                                                <span>Changes applied</span>
                                            </div>
                                            {onViewChange && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 text-xs flex items-center gap-1 hover:bg-muted"
                                                    onClick={() => onViewChange('changes')}
                                                >
                                                    <Eye className="w-3 h-3" />
                                                    View Changes
                                                </Button>
                                            )}
                                        </div>
                                    ) : (
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="h-6 text-xs"
                                            onClick={() => msg.actionData && handleApplyAction(msg.id, msg.actionData)}
                                        >
                                            Apply Changes
                                        </Button>
                                    )}
                                    {/* Optional "View Changes" if we had access to trigger it, but standard CMS UI handles it */}
                                </div>
                            )}
                        </div>
                    ))}
                    {isStreaming && messages[messages.length - 1]?.content === "" && (
                        <div className="flex items-center gap-2 text-muted-foreground text-xs ml-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Bot className="w-3 h-3" />
                            <span className="flex items-center gap-0.5">
                                Thinking
                                <span className="flex gap-0.5 ml-1">
                                    <span className="animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }}>.</span>
                                    <span className="animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1s' }}>.</span>
                                    <span className="animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1s' }}>.</span>
                                </span>
                            </span>
                        </div>
                    )}
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t bg-background shrink-0">
                <div className="relative">
                    <Textarea 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask AI to edit content..."
                        className="min-h-[80px] max-h-[160px] pr-10 resize-none font-normal"
                        disabled={isStreaming}
                    />
                    <Button 
                        size="icon" 
                        variant="ghost" 
                        className="absolute right-2 bottom-2 h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                        onClick={handleSubmit}
                        disabled={!input.trim() || isStreaming}
                    >
                        {isStreaming ? <Spinner className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                    </Button>
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground text-center flex justify-between px-1">
                    <span>Llama 3.3 70B</span>
                    <span>AI can make mistakes. Review edits.</span>
                </div>
            </div>
        </div>
    );
}
