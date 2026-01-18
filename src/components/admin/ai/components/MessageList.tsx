import * as React from "react";
import { Bot, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import type { UIMessage } from "@/lib/ai/types";
import { stripActionBlock } from "../utils/actionParser";
import { AIEditFeedback } from "./AIEditFeedback";
import { DEFAULT_LOCALE } from "@/lib/i18n-utils";

interface MessageListProps {
    messages: UIMessage[];
    isStreaming: boolean;
    onApplyAction: (messageId: string, actionData: any) => void;
    onViewChange?: (view: 'content' | 'globals' | 'changes' | 'history') => void;
    defaultLocale?: string;
}

export function MessageList({ messages, isStreaming, onApplyAction, onViewChange, defaultLocale = DEFAULT_LOCALE }: MessageListProps) {
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
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 max-w-3xl mx-auto w-full">
                {messages.map((msg, index) => (
                    <div 
                        key={msg.id} 
                        className={cn(
                            "flex flex-col gap-2 max-w-full animate-in fade-in slide-in-from-bottom-2 duration-300 group",
                            msg.role === 'user' ? "items-end" : "items-start w-full"
                        )}
                        style={{
                            animationDelay: `${Math.min(index * 50, 300)}ms`,
                            animationFillMode: 'backwards'
                        }}
                    >
                        {/* User message - Blue bubble style */}
                        {msg.role === 'user' && (
                            <div className="max-w-[85%] px-4 py-2.5 bg-primary text-primary-foreground rounded-2xl rounded-tr-sm shadow-sm transition-all duration-200 group-hover:shadow-md">
                                <div className="whitespace-pre-wrap leading-relaxed text-[15px]">{msg.content}</div>
                            </div>
                        )}

                        {/* AI message - Stripe-like clean text style */}
                        {msg.role === 'assistant' && (
                            <div className="w-full">
                                <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
                                    <ReactMarkdown 
                                        components={{
                                            pre: ({node, ...props}) => (
                                                <div className="overflow-auto w-full my-4 bg-muted/50 p-4 rounded-lg border border-border/50">
                                                    <pre className="m-0 text-[13px] leading-relaxed" {...props} />
                                                </div>
                                            ),
                                            code: ({node, ...props}) => <code className="bg-muted/70 px-1.5 py-0.5 rounded font-mono text-[0.85em] font-medium" {...props} />,
                                            p: ({node, ...props}) => <p className="mb-4 last:mb-0 leading-relaxed text-[15px]" {...props} />,
                                            ul: ({node, ...props}) => <ul className="mb-4 space-y-2 list-disc pl-5 text-[15px]" {...props} />,
                                            ol: ({node, ...props}) => <ol className="mb-4 space-y-2 list-decimal pl-5 text-[15px]" {...props} />,
                                            li: ({node, ...props}) => <li className="leading-relaxed pl-1" {...props} />,
                                            h1: ({node, ...props}) => <h1 className="text-xl font-semibold mb-4 mt-6 first:mt-0 text-foreground" {...props} />,
                                            h2: ({node, ...props}) => <h2 className="text-lg font-semibold mb-3 mt-5 first:mt-0 text-foreground" {...props} />,
                                            h3: ({node, ...props}) => <h3 className="text-base font-semibold mb-2 mt-4 first:mt-0 text-foreground" {...props} />,
                                            a: ({node, ...props}) => <a className="text-primary hover:underline font-medium" {...props} />,
                                            blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-primary/30 pl-4 py-0.5 italic text-muted-foreground my-4" {...props} />,
                                            strong: ({node, ...props}) => <strong className="font-semibold text-foreground" {...props} />,
                                            hr: ({node, ...props}) => <hr className="my-6 border-border/50" {...props} />,
                                        }}
                                    >
                                        {stripActionBlock(msg.content)}
                                    </ReactMarkdown>
                                </div>
                                {msg.isStreaming && msg.content && (
                                    <span className="inline-block w-1 h-5 bg-primary ml-0.5 animate-pulse rounded-sm align-middle mt-1" />
                                )}
                            </div>
                        )}

                        {/* Action Feedback - actions are auto-applied when AI response completes */}
                        {msg.hasAction && msg.actionApplied && (
                            <div className="w-full mt-4 animate-in fade-in slide-in-from-left-2 duration-300">
                                <AIEditFeedback 
                                    actionData={msg.actionData!}
                                    previousData={msg.previousData}
                                    schemaName={msg.schemaName}
                                    defaultLocale={defaultLocale}
                                />
                            </div>
                        )}
                        
                        {/* Parse Error Feedback */}
                        {msg.parseError && (
                            <div className="flex items-start gap-2.5 mt-2 px-3 py-2.5 rounded-xl bg-orange-500/5 border border-orange-500/20 text-orange-600 dark:text-orange-400 animate-in fade-in slide-in-from-left-1 duration-200 shadow-sm max-w-[85%]">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs font-semibold">AI provided an invalid action format</span>
                                    <span className="text-[10px] opacity-80">{msg.parseError}</span>
                                </div>
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
