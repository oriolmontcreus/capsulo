import * as React from "react";
import { Send, Sparkles, User, Bot, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { useCMSContext } from "@/lib/ai/useCMSContext";
import { aiService } from "@/lib/ai/AIService";
import { cn } from "@/lib/utils";

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

export function ChatInterface() {
    const { pageData, globalData, selectedPage } = useCMSContext();
    const [messages, setMessages] = React.useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: "Hello! I'm your AI assistant. I can help you manage your content, translate fields, or rewrite valid standard JSON components. How can I help you today?"
        }
    ]);
    const [input, setInput] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
    const scrollViewportRef = React.useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom directly on the viewport element
    React.useEffect(() => {
        const scrollToBottom = () => {
             const viewport = document.querySelector('[data-radix-scroll-area-viewport]');
             if (viewport) {
                 viewport.scrollTop = viewport.scrollHeight;
             }
        };
        // Small timeout to ensure DOM is updated
        setTimeout(scrollToBottom, 100);
    }, [messages]);

    const handleApplyAction = React.useCallback((messageId: string, actionData: any) => {
        if (!actionData || !actionData.componentId || !actionData.data) return;

        // Dispatch event to CMSManager
        window.dispatchEvent(new CustomEvent('cms-ai-update-component', {
            detail: {
                componentId: actionData.componentId,
                data: actionData.data
            }
        }));

        // Mark as applied
        setMessages(prev => prev.map(m => 
            m.id === messageId ? { ...m, actionApplied: true } : m
        ));
    }, []);

    const parseActionFromContent = (content: string) => {
        // Look for ```json { "action": ... } ``` block
        const jsonBlockRegex = /```json\s*(\{[\s\S]*?"action"\s*:\s*"update"[\s\S]*?\})\s*```/;
        const match = content.match(jsonBlockRegex);
        if (match && match[1]) {
            try {
                return JSON.parse(match[1]);
            } catch (e) {
                console.error("Failed to parse AI action JSON", e);
            }
        }
        return null;
    };

    const handleSubmit = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);

        const assistantMsgId = (Date.now() + 1).toString();
        let currentContent = "";
        
        // Add placeholder assistant message
        setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: "", isStreaming: true }]);

        try {
            const context = {
                page: {
                    id: selectedPage,
                    data: pageData
                },
                globals: globalData
            };
            
            // Format history for API (exclude system messages if any, simple mapping)
            const history = messages.filter(m => m.role !== 'assistant' || m.id !== 'welcome').map(m => ({
                role: m.role,
                content: m.content
            }));

            await aiService.generateStream(
                {
                    message: userMsg.content,
                    context,
                    history
                },
                {
                    onToken: (token) => {
                        currentContent += token;
                        setMessages(prev => prev.map(m => 
                            m.id === assistantMsgId ? { ...m, content: currentContent } : m
                        ));
                    },
                    onComplete: (fullText) => {
                        const actionData = parseActionFromContent(fullText);
                        
                        setMessages(prev => prev.map(m => 
                            m.id === assistantMsgId ? { 
                                ...m, 
                                content: fullText, 
                                isStreaming: false,
                                hasAction: !!actionData,
                                actionData: actionData
                            } : m
                        ));
                        setIsLoading(false);
                        
                        // Auto-apply or just show button? User said: "It should automatically apply the change. With a button to view the changes"
                        // But also "With a button to view the changes (just reuse the component / logic of...)".
                        // Wait, if I auto-apply, the "View Changes" bar appears automatically (handled in CMSManager).
                        // So I should trigger apply immediately if action is found.
                        
                        if (actionData) {
                             handleApplyAction(assistantMsgId, actionData);
                        }
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
             setMessages(prev => prev.map(m => 
                m.id === assistantMsgId ? { 
                    ...m, 
                    content: `**System Error:** ${error.message}`, 
                    isStreaming: false 
                } : m
            ));
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
        <div className="flex flex-col h-full bg-background">
            <div className="flex items-center px-4 py-3 border-b bg-muted/30">
                <Sparkles className="w-4 h-4 text-primary mr-2" />
                <h3 className="text-sm font-medium">AI Assistant</h3>
                {selectedPage && (
                     <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                         Context: {selectedPage}
                     </span>
                )}
            </div>

            <ScrollArea className="flex-1 p-4 max-h-[calc(100vh-41px)]">
                <div className="space-y-4 pb-4">
                    {messages.map((msg) => (
                        <div key={msg.id} className={cn("flex flex-col gap-1", msg.role === 'user' ? "items-end" : "items-start")}>
                            <div className={cn(
                                "max-w-[90%] px-3 py-2 rounded-lg text-sm",
                                msg.role === 'user' 
                                    ? "bg-primary text-primary-foreground rounded-tr-none" 
                                    : "bg-muted rounded-tl-none"
                            )}>
                                <SimpleMarkdown content={msg.content} />
                            </div>
                            
                            {/* Action Feedback */}
                            {msg.hasAction && msg.actionApplied && (
                                <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 ml-2">
                                    <Check className="w-3 h-3" />
                                    <span>Changes applied to inspector</span>
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && messages[messages.length - 1]?.role === 'user' && (
                        <div className="flex items-center gap-2 text-muted-foreground text-xs ml-2">
                            <Spinner className="w-3 h-3" />
                            Thinking...
                        </div>
                    )}
                </div>
            </ScrollArea>

            <div className="p-4 border-t mt-auto">
                <div className="relative">
                    <Textarea 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask AI to edit content..."
                        className="min-h-[80px] pr-10 resize-none"
                        disabled={isLoading}
                    />
                    <Button 
                        size="icon" 
                        variant="ghost" 
                        className="absolute right-2 bottom-2 h-8 w-8"
                        onClick={handleSubmit}
                        disabled={!input.trim() || isLoading}
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground text-center">
                    AI can make mistakes. Review changes before publishing.
                </div>
            </div>
        </div>
    );
}
