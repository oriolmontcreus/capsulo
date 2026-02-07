import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { ImageZoom } from "@/components/ui/image-zoom";
import type { UIMessage } from "@/lib/ai/types";
import { DEFAULT_LOCALE } from "@/lib/i18n-utils";
import { stripActionBlock } from "../utils/actionParser";
import { AIEditFeedback } from "./AIEditFeedback";
import { StreamingCursor } from "./StreamingCursor";

interface RetryState {
  countdown: number;
  attempt: number;
}

interface MessageListProps {
  messages: UIMessage[];
  isStreaming: boolean;
  onApplyAction: (messageId: string, actionData: any) => void;
  onViewChange?: (view: "content" | "globals" | "changes" | "history") => void;
  defaultLocale?: string;
  retryState?: RetryState | null;
}

export function MessageList({
  messages,
  isStreaming,
  onApplyAction,
  onViewChange,
  defaultLocale = DEFAULT_LOCALE,
  retryState,
}: MessageListProps) {
  const shouldShowCursor = (msg: UIMessage, index: number): boolean => {
    if (msg.id === "welcome") return false;
    if (!isStreaming) return false;
    if (!msg.isStreaming) return false;
    if (!msg.content) return false;
    if (index !== messages.length - 1) return false;
    return true;
  };

  return (
    <div className="@container mx-auto flex w-full max-w-3xl flex-col gap-8">
      {messages.map((msg, index) => (
        <Message
          className="fade-in slide-in-from-bottom-2 animate-in duration-300"
          from={msg.role === "error" || msg.role === "retry" ? "assistant" : msg.role}
          key={msg.id}
          style={{
            animationDelay: `${Math.min(index * 50, 300)}ms`,
            animationFillMode: "backwards",
          }}
        >
          <MessageContent>
            {msg.role === "user" ? (
              <div className="flex flex-col gap-3">
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mb-1 flex flex-wrap gap-2">
                    {msg.attachments.map((at, i) => (
                      <ImageZoom key={i}>
                        <div className="group relative max-w-[240px] overflow-hidden rounded-lg border border-border/40 bg-muted/20 shadow-sm">
                          <img
                            alt={at.name || "User attachment"}
                            className="h-auto max-h-[300px] w-full object-contain transition-transform duration-300 hover:scale-[1.02]"
                            src={`data:${at.mimeType};base64,${at.data}`}
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
            ) : msg.role === "error" ? (
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="text-sm">{msg.content}</span>
              </div>
            ) : msg.role === "retry" ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="h-4 w-4 shrink-0" />
                <span className="text-sm">{msg.content}</span>
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

          {/* Preparing Actions Loading State */}
          {msg.role === "assistant" &&
            msg.isPreparingActions &&
            !msg.actionData && (
              <div className="fade-in mt-2 flex w-full animate-in items-center gap-2 text-muted-foreground duration-200">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Preparing changes...</span>
              </div>
            )}

          {/* Action Feedback - Integration within the Message container */}
          {msg.role === "assistant" && msg.actionData && msg.actionApplied && (
            <div className="fade-in slide-in-from-left-2 mt-2 w-full animate-in duration-300">
              <AIEditFeedback
                actionData={msg.actionData!}
                defaultLocale={defaultLocale}
                previousData={msg.previousData}
                schemaName={msg.schemaName}
              />
            </div>
          )}

          {/* Parse Error Feedback */}
          {msg.role === "assistant" && msg.parseError && (
            <div className="fade-in slide-in-from-left-1 mt-2 flex max-w-[85%] animate-in items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-destructive shadow-sm duration-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-xs">
                  AI provided an invalid action format
                </span>
                <span className="text-xs opacity-80">{msg.parseError}</span>
              </div>
            </div>
          )}
        </Message>
      ))}

      {/* Initial streaming cursor - shows when waiting for first content */}
      {isStreaming &&
        (messages.length === 0 ||
          messages[messages.length - 1]?.content === "") && (
          <Message className="fade-in animate-in duration-200" from="assistant">
            <MessageContent>
              <StreamingCursor isActive />
            </MessageContent>
          </Message>
        )}

      {/* Retry Countdown - shows in message area while retrying */}
      {retryState && (
        <Message className="fade-in animate-in duration-200" from="assistant">
          <MessageContent>
            <div className="flex animate-pulse items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Retrying in {retryState.countdown}s...</span>
            </div>
          </MessageContent>
        </Message>
      )}
    </div>
  );
}
