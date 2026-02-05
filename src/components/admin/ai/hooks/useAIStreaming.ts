import * as React from "react";
import { aiService } from "@/lib/ai/AIService";
import { chatStorage } from "@/lib/ai/chat-storage";
import type { Attachment, Message, UIMessage } from "@/lib/ai/types";
import { generateId } from "@/lib/utils/id-generation";

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
  /** Callback to auto-apply action when streaming completes with an action */
  onAutoApplyAction?: (
    messageId: string,
    actionData: any,
    setMessages: React.Dispatch<React.SetStateAction<UIMessage[]>>
  ) => Promise<void> | void;
}

export function useAIStreaming({
  currentConversationId,
  messages,
  setMessages,
  setStorageError,
  updateConversationTitle,
  onAutoApplyAction,
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

  const handleSubmit = async (
    input: string,
    context: StreamingContext,
    attachments?: Attachment[]
  ) => {
    if (!input.trim() || isStreaming || !currentConversationId) return;

    const conversationId = currentConversationId;
    const userMsg: Message = {
      id: generateId(),
      role: "user",
      content: input,
      createdAt: Date.now(),
      actionData: null,
      attachments,
    };

    // Optimistic UI
    setMessages((prev) => [...prev, userMsg]);
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
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        createdAt: Date.now(),
        actionData: null,
        isStreaming: true,
      },
    ]);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Check if this is the first user message (not counting system/welcome messages)
      const userMessageCount = messages.filter((m) => m.role === "user").length;
      const isFirstMessage = userMessageCount === 0;

      await aiService.generateStream(
        {
          message: userMsg.content,
          context,
          history,
          isFirstMessage,
          attachments,
        },
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
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: pendingContentRef.current }
                    : m
                )
              );
            } else if (!throttleTimerRef.current) {
              // Schedule an update if one isn't already scheduled
              throttleTimerRef.current = setTimeout(() => {
                if (!isMountedRef.current) return;
                lastUpdateTimeRef.current = Date.now();
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, content: pendingContentRef.current }
                      : m
                  )
                );
                throttleTimerRef.current = null;
              }, 100 - timeSinceLastUpdate);
            }
          },
          onTitle: async (title) => {
            if (!isMountedRef.current) return;
            await updateConversationTitle(conversationId, title);
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

            // Create the message without action data initially
            const assistantMsg: Message = {
              id: assistantMsgId,
              role: "assistant",
              content: fullText,
              createdAt: Date.now(),
              actionData: null,
            };

            // Update UI state - message is complete, show preparing state
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...assistantMsg,
                      isStreaming: false,
                      isPreparingActions: true,
                    }
                  : m
              )
            );
            setIsStreaming(false);

            // Get CMS actions from conversation
            const allMessages = [
              ...messages.map((m) => ({ role: m.role, content: m.content })),
              { role: "user", content: userMsg.content },
              { role: "assistant", content: fullText },
            ];

            try {
              const actions = await aiService.getCmsActions(
                allMessages,
                context
              );

              if (actions.length > 0) {
                console.log(
                  `[useAIStreaming] Applying ${actions.length} CMS action(s)`
                );

                // Apply actions sequentially
                for (const action of actions) {
                  try {
                    console.log(
                      `[useAIStreaming] Applying action for ${action.componentName}`
                    );

                    if (onAutoApplyAction) {
                      await onAutoApplyAction(
                        assistantMsgId,
                        action,
                        setMessages
                      );
                    }
                  } catch (error) {
                    console.error(
                      `[useAIStreaming] Failed to apply action for ${action.componentName}:`,
                      error
                    );
                    // Continue with next action
                  }
                }
              } else {
                // No actions, just save the message
                await chatStorage.addMessage(conversationId, assistantMsg);
              }
            } catch (error) {
              console.error(
                "[useAIStreaming] Error getting/applying actions:",
                error
              );
              // Save message anyway
              await chatStorage.addMessage(conversationId, assistantMsg);
            } finally {
              // Hide preparing state
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, isPreparingActions: false }
                    : m
                )
              );
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

            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      content:
                        currentContent + `\n\n**Error:** ${error.message}`,
                      isStreaming: false,
                    }
                  : m
              )
            );
            setIsStreaming(false);
          },
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
    handleSubmit,
  };
}
