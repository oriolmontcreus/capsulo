import * as React from "react";
import { Bot, Check, AlertCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import type { UIMessage } from "@/lib/ai/types";
import { stripActionBlock } from "../utils/actionParser";

interface MessageListProps {
    messages: UIMessage[];
    isStreaming: boolean;
    onApplyAction: (messageId: string, actionData: any) => void;
    onViewChange?: (view: 'content' | 'globals' | 'changes' | 'history') => void;
}

export function MessageList({ messages, isStreaming, onApplyAction, onViewChange }: MessageListProps) {
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

    return (
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
                                    onClick={() => msg.actionData && onApplyAction(msg.id, msg.actionData)}
                                >
                                    Apply Changes
                                </Button>
                            )}
                        </div>
                    )}
                    
                    {/* Parse Error Feedback */}
                    {msg.parseError && (
                        <div className="flex items-center gap-2 mt-1 ml-1 text-xs text-yellow-600 dark:text-yellow-400 animate-in fade-in slide-in-from-left-1 duration-200">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span>{msg.parseError}</span>
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
    );
}
