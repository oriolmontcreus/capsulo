import * as React from "react";
import { Bot, Check, AlertCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import type { UIMessage } from "@/lib/ai/types";
import { stripActionBlock } from "../utils/actionParser";
import { AIEditFeedback } from "./AIEditFeedback";

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
        <ScrollArea ref={scrollAreaRef} className="flex-1 w-full min-h-0 bg-background">
            <div className="flex flex-col gap-8 p-4 md:p-6 lg:p-8 max-w-4xl mx-auto w-full">
                {messages.map((msg, index) => (
                    <div 
                        key={msg.id} 
                        className={cn(
                            "flex flex-col gap-2 max-w-full animate-in fade-in slide-in-from-bottom-2 duration-300 group",
                            msg.role === 'user' ? "items-end" : "items-start"
                        )}
                        style={{
                            animationDelay: `${Math.min(index * 50, 300)}ms`,
                            animationFillMode: 'backwards'
                        }}
                    >
                        {msg.role === 'assistant' && (
                            <div className="flex items-center gap-2 mb-0.5 px-1">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm">
                                    <Bot className="w-3.5 h-3.5 text-primary" />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Capsulo AI</span>
                            </div>
                        )}

                        <div className={cn(
                            "max-w-[85%] px-4 py-3 shadow-sm transition-all duration-200 group-hover:shadow-md",
                            msg.role === 'user' 
                                ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm" 
                                : "bg-muted/40 border border-border/40 rounded-2xl rounded-tl-sm prose prose-sm dark:prose-invert max-w-none w-full"
                        )}>
                            {msg.role === 'user' ? (
                                <div className="flex flex-col items-end gap-1">
                                    <div className="whitespace-pre-wrap leading-relaxed text-[15px]">{msg.content}</div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="leading-relaxed text-[15px]">
                                        <ReactMarkdown 
                                            components={{
                                                pre: ({node, ...props}) => (
                                                    <div className="overflow-auto w-full my-4 bg-background/60 backdrop-blur-sm p-4 rounded-xl border border-border/40 shadow-inner">
                                                        <pre className="m-0 text-[13px] leading-relaxed" {...props} />
                                                    </div>
                                                ),
                                                code: ({node, ...props}) => <code className="bg-background/80 px-1.5 py-0.5 rounded-md font-mono text-[0.85em] font-medium border border-border/30" {...props} />,
                                                p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
                                                ul: ({node, ...props}) => <ul className="mb-3 space-y-1.5 list-disc pl-4" {...props} />,
                                                ol: ({node, ...props}) => <ol className="mb-3 space-y-1.5 list-decimal pl-4" {...props} />,
                                                h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-4 mt-2" {...props} />,
                                                h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-3 mt-2" {...props} />,
                                                h3: ({node, ...props}) => <h3 className="text-base font-bold mb-2 mt-1" {...props} />,
                                                a: ({node, ...props}) => <a className="text-primary hover:underline font-medium" {...props} />,
                                                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-primary/20 pl-4 py-1 italic text-muted-foreground" {...props} />,
                                            }}
                                        >
                                            {stripActionBlock(msg.content)}
                                        </ReactMarkdown>
                                    </div>
                                    {msg.isStreaming && msg.content && (
                                        <span className="inline-block w-1.5 h-4 bg-primary/40 ml-0.5 animate-pulse rounded-full align-middle" />
                                    )}
                                </div>
                            )}
                        </div>
                        
                        {/* Action Feedback */}
                        {msg.hasAction && (
                            <div className="flex items-center gap-2 mt-2 px-1 animate-in fade-in slide-in-from-left-1 duration-200">
                                {msg.actionApplied ? (
                                    <div className="flex items-center gap-3">
                                        <AIEditFeedback 
                                            actionData={msg.actionData!}
                                            previousData={msg.previousData}
                                            schemaName={msg.schemaName} 
                                        />
                                    </div>
                                ) : (
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-9 text-xs font-semibold rounded-full px-5 shadow-sm hover:shadow-md hover:bg-primary hover:text-primary-foreground transition-all active:scale-[0.98] border-primary/20"
                                        onClick={() => msg.actionData && onApplyAction(msg.id, msg.actionData)}
                                    >
                                        Apply Changes
                                    </Button>
                                )}
                            </div>
                        )}
                        
                        {/* Parse Error Feedback */}
                        {msg.parseError && (
                            <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-xl bg-orange-500/5 border border-orange-500/20 text-xs text-orange-600 dark:text-orange-400 animate-in fade-in slide-in-from-left-1 duration-200 shadow-sm">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span className="font-medium">{msg.parseError}</span>
                            </div>
                        )}
                    </div>
                ))}
                
                {isStreaming && (messages.length === 0 || messages[messages.length - 1]?.content === "") && (
                    <div className="flex items-center gap-4 text-muted-foreground text-sm px-2 py-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
                            <Bot className="w-4 h-4 animate-pulse text-primary/60" />
                        </div>
                        <span className="flex items-center gap-1.5 font-medium italic text-muted-foreground/60">
                            Thinking
                            <span className="flex gap-1 ml-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary/30 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-1.5 h-1.5 rounded-full bg-primary/30 animate-bounce" style={{ animationDelay: '200ms' }}></span>
                                <span className="w-1.5 h-1.5 rounded-full bg-primary/30 animate-bounce" style={{ animationDelay: '400ms' }}></span>
                            </span>
                        </span>
                    </div>
                )}
            </div>
        </ScrollArea>
    );
}
