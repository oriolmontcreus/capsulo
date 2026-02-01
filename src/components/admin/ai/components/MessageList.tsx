import { AlertCircle } from "lucide-react";
import type { UIMessage } from "@/lib/ai/types";
import { stripActionBlock } from "../utils/actionParser";
import { AIEditFeedback } from "./AIEditFeedback";
import { StreamingCursor } from "./StreamingCursor";
import { DEFAULT_LOCALE } from "@/lib/i18n-utils";
import { 
    Message, 
    MessageContent, 
    MessageResponse 
} from "@/components/ai-elements/message";
import { ImageZoom } from "@/components/ui/image-zoom";

interface MessageListProps {
    messages: UIMessage[];
    isStreaming: boolean;
    onApplyAction: (messageId: string, actionData: any) => void;
    onViewChange?: (view: 'content' | 'globals' | 'changes' | 'history') => void;
    defaultLocale?: string;
}

export function MessageList({ messages, isStreaming, onApplyAction, onViewChange, defaultLocale = DEFAULT_LOCALE }: MessageListProps) {
    const shouldShowCursor = (msg: UIMessage, index: number): boolean => {
        if (msg.id === 'welcome') return false;
        if (!isStreaming) return false;
        if (!msg.isStreaming) return false;
        if (!msg.content) return false;
        if (index !== messages.length - 1) return false;
        return true;
    };

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
                            <div className="flex flex-col gap-3">
                                {msg.attachments && msg.attachments.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-1">
                                        {msg.attachments.map((at, i) => (
                                            <ImageZoom key={i}>
                                                <div className="relative group overflow-hidden rounded-lg border border-border/40 bg-muted/20 shadow-sm max-w-[240px]">
                                                    <img
                                                        src={`data:${at.mimeType};base64,${at.data}`}
                                                        alt={at.name || "User attachment"}
                                                        className="w-full h-auto max-h-[300px] object-contain transition-transform duration-300 hover:scale-[1.02]"
                                                    />
                                                </div>
                                            </ImageZoom>
                                        ))}
                                    </div>
                                )}
                                <div className="whitespace-pre-wrap leading-relaxed">
                                    {msg.content}
                                </div>
                            </div>
                        ) : (
                            <div className="w-full">
                                <MessageResponse>
                                    {stripActionBlock(msg.content)}
                                </MessageResponse>
                                <StreamingCursor isActive={shouldShowCursor(msg, index)} />
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
            
            {/* Initial streaming cursor - shows when waiting for first content */}
            {isStreaming && (messages.length === 0 || messages[messages.length - 1]?.content === "") && (
                <Message from="assistant" className="animate-in fade-in duration-200">
                    <MessageContent>
                        <StreamingCursor isActive />
                    </MessageContent>
                </Message>
            )}
            </div>
    );
}
