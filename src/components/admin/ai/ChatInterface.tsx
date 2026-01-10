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

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    isStreaming?: boolean;
    hasAction?: boolean;
    actionApplied?: boolean;
    actionData?: any;
}

const SimpleMarkdown = ({ content }: { content: string }) => {
    // Basic formatting: bold, code blocks, newlines
    const parts = content.split(/(\*\*.*?\*\*|`.*?`|```[\s\S]*?```|\n)/g);
    
    return (
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {parts.map((part, i) => {
                if (part.startsWith("```")) {
                    const code = part.replace(/```[a-z]*\n?|```/g, "");
                    return <pre key={i} className="bg-muted p-2 rounded-md overflow-x-auto my-2 text-xs font-mono">{code}</pre>;
                }
                if (part.startsWith("`") && part.endsWith("`")) {
                    return <code key={i} className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
                }
                if (part.startsWith("**") && part.endsWith("**")) {
                    return <strong key={i}>{part.slice(2, -2)}</strong>;
                }
                if (part === "\n") return <br key={i} />;
                return <span key={i}>{part}</span>;
            })}
        </div>
    );
};

interface ChatInterfaceProps {
    onViewChange?: (view: 'content' | 'globals' | 'changes' | 'history') => void;
}

export function ChatInterface({ onViewChange }: ChatInterfaceProps) {
    const { pageData, globalData, selectedPage } = useCMSContext();
    const [messages, setMessages] = React.useState<Message[]>([]);
    const [conversations, setConversations] = React.useState<any[]>([]);
    const [currentConversationId, setCurrentConversationId] = React.useState<string | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
    
    const [input, setInput] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
    
    // Initial Load & Cleanup
    React.useEffect(() => {
        const init = async () => {
            await chatStorage.cleanupOldChats();
            const convs = await chatStorage.getConversations();
            setConversations(convs.reverse()); // Newest first

            if (convs.length > 0) {
                // Load most recent
                loadConversation(convs[0].id);
            } else {
                createNewChat();
            }
        };
        init();
    }, []);

    const createNewChat = async () => {
        const id = await chatStorage.createConversation("New Chat " + new Date().toLocaleTimeString());
        setConversations(prev => [{ id, title: "New Chat", updatedAt: Date.now() }, ...prev]);
        setCurrentConversationId(id);
        setMessages([{
             id: 'welcome',
             role: 'assistant',
             content: "Hello! I'm your AI assistant. I can help you manage your content, translate fields, or rewrite valid standard JSON components. How can I help you today?"
        }]);
        setIsHistoryOpen(false);
    };

    const loadConversation = async (id: string) => {
        const msgs = await chatStorage.getMessages(id);
        setCurrentConversationId(id);
        if (msgs.length === 0) {
             setMessages([{
                 id: 'welcome',
                 role: 'assistant',
                 content: "Hello! I'm your AI assistant. I can help you manage your content, translate fields, or rewrite valid standard JSON components. How can I help you today?"
            }]);
        } else {
            // Sort by createdAt just in case
            setMessages(msgs.sort((a, b) => a.createdAt - b.createdAt));
        }
        setIsHistoryOpen(false);
    };

    const deleteConversation = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await chatStorage.deleteConversation(id);
        const remaining = conversations.filter(c => c.id !== id);
        setConversations(remaining);
        
        if (currentConversationId === id) {
             if (remaining.length > 0) loadConversation(remaining[0].id);
             else createNewChat();
        }
    };

    // Auto-scroll logic
    React.useEffect(() => {
        const viewport = document.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
             viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
        }
    }, [messages, isLoading]);

    const { defaultLocale } = useTranslation();

    const handleApplyAction = React.useCallback(async (messageId: string, actionData: any) => {
        if (!actionData || !actionData.componentId || !actionData.data) return;

        // Sanitize data: 
        // 1. If AI sends { type: "...", value: "..." }, extract "value".
        // 2. If AI sends { "en": "...", "es": "..." } (translation object) for a field that might be string-only in current view,
        //    we should probably resolve it to the specific locale string if we are in "content editing" mode which usually defaults to default locale.
        const sanitizedData: Record<string, any> = {};
        
        Object.entries(actionData.data).forEach(([key, value]: [string, any]) => {
            let cleanValue = value;

            // Unwrap internal structure
            if (value && typeof value === 'object' && 'value' in value && 'type' in value) {
                cleanValue = value.value;
            }

            // Unwrap translation object if incorrectly sent as object
            // Heuristic: if object has keys that look like locales (2 chars) and no 'value'/'type' property.
            if (cleanValue && typeof cleanValue === 'object' && !Array.isArray(cleanValue)) {
                const keys = Object.keys(cleanValue);
                const looksLikeLocales = keys.every(k => k.length === 2); // Simple 2-char check
                if (looksLikeLocales) {
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

    const parseActionFromContent = (content: string) => {
        // Support wrapped <cms-edit> ... </cms-edit> (Preferred)
        const xmlRegex = /<cms-edit>\s*(\{[\s\S]*?\})\s*<\/cms-edit>/;
        const xmlMatch = content.match(xmlRegex);
        if (xmlMatch && xmlMatch[1]) {
            try { return JSON.parse(xmlMatch[1]); } catch (e) { console.error("Failed to parse AI action XML/JSON", e); }
        }

        // Fallback to markdown code block
        const jsonBlockRegex = /```json\s*(\{[\s\S]*?"action"\s*:\s*"update"[\s\S]*?\})\s*```/;
        const match = content.match(jsonBlockRegex);
        if (match && match[1]) {
            try { return JSON.parse(match[1]); } catch (e) { console.error("Failed to parse AI action JSON", e); }
        }
        return null;
    };

    const stripActionBlock = (content: string) => {
        // Removes the JSON/XML action block for display
        return content
            .replace(/<cms-edit>[\s\S]*?<\/cms-edit>/g, '')
            .replace(/```json\s*\{[\s\S]*?"action"\s*:\s*"update"[\s\S]*?\}\s*```/g, '')
            .trim();
    };

    const handleSubmit = async () => {
        if (!input.trim() || isLoading || !currentConversationId) return;

        const userMsg: Message = { 
            id: crypto.randomUUID(), 
            role: 'user', 
            content: input,
            createdAt: Date.now() // Add timestamp for sorting
        } as Message;

        // Optimistic UI
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);

        // Save User Message
        try {
            await chatStorage.addMessage(currentConversationId, userMsg);
        } catch (e) {
            console.error("Failed to save user message", e);
            // We continue anyway so the user gets a response
        }

        const assistantMsgId = crypto.randomUUID();
        let currentContent = "";
        
        // Placeholder for stream
        setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: "", isStreaming: true }]);

        try {
            const context = {
                page: { id: selectedPage, data: pageData },
                globals: globalData
            };
            
            const history = messages
                .filter(m => m.id !== 'welcome')
                .map(m => ({ role: m.role, content: m.content }));

            await aiService.generateStream(
                { message: userMsg.content, context, history },
                {
                    onToken: (token) => {
                        currentContent += token;
                        setMessages(prev => prev.map(m => 
                            m.id === assistantMsgId ? { ...m, content: currentContent } : m
                        ));
                    },
                    onComplete: async (fullText) => {
                        const actionData = parseActionFromContent(fullText);
                        const assistantMsg: any = { 
                            id: assistantMsgId,
                            role: 'assistant',
                            content: fullText,
                            createdAt: Date.now(),
                            hasAction: !!actionData,
                            actionData: actionData
                        };

                        setMessages(prev => prev.map(m => 
                             m.id === assistantMsgId ? { ...assistantMsg, isStreaming: false } : m
                        ));
                        setIsLoading(false);

                        // Save Assistant Message
                        await chatStorage.addMessage(currentConversationId, assistantMsg);
                        
                        if (actionData) handleApplyAction(assistantMsgId, actionData);
                    },
                    onError: (error) => {
                        setMessages(prev => prev.map(m => 
                            m.id === assistantMsgId ? { 
                                ...m, 
                                content: currentContent + `\n\n**Error:** ${error.message}`, 
                                isStreaming: false 
                            } : m
                        ));
                        setIsLoading(false);
                    }
                }
            );
        } catch (error: any) {
             setIsLoading(false);
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
                <Button variant="ghost" size="icon" className="w-6 h-6 ml-2 text-muted-foreground hover:text-foreground" onClick={createNewChat} title="New Chat">
                    <SquarePen className="w-4 h-4" />
                </Button>
            </div>

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
                                         currentConversationId === c.id ? "bg-accent/80 font-medium" : ""
                                     )}
                                 >
                                     <span className="truncate flex-1 pr-2">{c.title}</span>
                                     <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        onClick={(e) => deleteConversation(e, c.id)}
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
            <ScrollArea className="flex-1 w-full bg-background overflow-y-auto">
                    {messages.map((msg) => (
                        <div key={msg.id} className={cn("flex flex-col gap-1 max-w-full", msg.role === 'user' ? "items-end" : "items-start")}>
                            <div className={cn(
                                "max-w-[90%] px-3 py-2 rounded-lg text-sm overflow-hidden",
                                msg.role === 'user' 
                                    ? "bg-primary text-primary-foreground rounded-tr-none" 
                                    : "bg-muted rounded-tl-none prose prose-sm dark:prose-invert max-w-none"
                            )}>
                                {msg.role === 'user' ? (
                                    <div className="whitespace-pre-wrap">{msg.content}</div>
                                ) : (
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
                                )}
                            </div>
                            
                            {/* Action Feedback */}
                            {msg.hasAction && (
                                <div className="flex items-center gap-2 mt-1 ml-1">
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
                    {isLoading && (
                        <div className="flex items-center gap-2 text-muted-foreground text-xs ml-2 animate-pulse">
                            <Bot className="w-3 h-3" />
                            <span>Thinking...</span>
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
                        disabled={isLoading}
                    />
                    <Button 
                        size="icon" 
                        variant="ghost" 
                        className="absolute right-2 bottom-2 h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                        onClick={handleSubmit}
                        disabled={!input.trim() || isLoading}
                    >
                        {isLoading ? <Spinner className="w-4 h-4" /> : <Send className="w-4 h-4" />}
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
