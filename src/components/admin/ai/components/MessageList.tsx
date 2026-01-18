import * as React from "react";
import { Bot, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UIMessage } from "@/lib/ai/types";
import { stripActionBlock } from "../utils/actionParser";
import { AIEditFeedback } from "./AIEditFeedback";
import { DEFAULT_LOCALE } from "@/lib/i18n-utils";
import { 
    Message, 
    MessageContent, 
    MessageResponse 
} from "@/components/ai-elements/message";

interface MessageListProps {
    messages: UIMessage[];
    isStreaming: boolean;
    onApplyAction: (messageId: string, actionData: any) => void;
    onViewChange?: (view: 'content' | 'globals' | 'changes' | 'history') => void;
    defaultLocale?: string;
}

export function MessageList({ messages, isStreaming, onApplyAction, onViewChange, defaultLocale = DEFAULT_LOCALE }: MessageListProps) {
    return (
        <div className="flex flex-col gap-8 max-w-3xl mx-auto w-full @container">
            {messages.map((msg, index) => (
                <Message 
                    key={msg.id} 
                    from={msg.role}
                    className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                    style={{
                        animationDelay: `${Math.min(index * 50, 300)}ms`,
                        animationFillMode: 'backwards'
                    }}
                >
                    <MessageContent>
                        {msg.role === 'user' ? (
                            <div className="whitespace-pre-wrap leading-relaxed">
                                {msg.content}
                            </div>
                        ) : (
                            <div className="w-full">
                                <MessageResponse>
                                    {stripActionBlock(msg.content)}
                                </MessageResponse>
                                {msg.isStreaming && msg.content && (
                                    <span className="inline-block w-1 h-5 bg-primary ml-0.5 animate-pulse rounded-sm align-middle mt-1" />
                                )}
                            </div>
                        )}
                    </MessageContent>

                    {/* Action Feedback - Integration within the Message container */}
                    {msg.role === 'assistant' && msg.actionData && msg.actionApplied && (
                        <div className="w-full mt-2 animate-in fade-in slide-in-from-left-2 duration-300">
                            <AIEditFeedback 
                                actionData={msg.actionData!}
                                previousData={msg.previousData}
                                schemaName={msg.schemaName}
                                defaultLocale={defaultLocale}
                            />
                        </div>
                    )}
                    
                    {/* Parse Error Feedback */}
                    {msg.role === 'assistant' && msg.parseError && (
                        <div className="flex items-start gap-2.5 mt-2 px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive animate-in fade-in slide-in-from-left-1 duration-200 shadow-sm max-w-[85%]">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-semibold">AI provided an invalid action format</span>
                                <span className="text-xs opacity-80">{msg.parseError}</span>
                            </div>
                        </div>
                    )}
                </Message>
            ))}
            
            {/* Thinking State */}
            {isStreaming && (messages.length === 0 || messages[messages.length - 1]?.content === "") && (
                <Message from="assistant" className="animate-in fade-in duration-300">
                    <MessageContent>
                        <div className="flex items-center gap-3 text-muted-foreground text-sm py-1">
                            <div className="w-6 h-6 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
                                <Bot className="w-3.5 h-3.5 animate-pulse text-primary/60" />
                            </div>
                            <span className="flex items-center gap-1.5 font-medium italic opacity-60">
                                Thinking
                                <span className="flex gap-1 ml-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary/30 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary/30 animate-bounce" style={{ animationDelay: '200ms' }}></span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary/30 animate-bounce" style={{ animationDelay: '400ms' }}></span>
                                </span>
                            </span>
                        </div>
                    </MessageContent>
                </Message>
            )}
        </div>
    );
}
