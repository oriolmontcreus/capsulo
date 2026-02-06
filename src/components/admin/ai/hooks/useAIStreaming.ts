import * as React from "react";
import { aiService } from "@/lib/ai/AIService";
import { chatStorage } from "@/lib/ai/chat-storage";
import type { AIMode } from "@/lib/ai/modelConfig";
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
  /** AI Mode to use for requests */
  mode?: AIMode;
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
  mode = "fast",
  onAutoApplyAction,
}: UseAIStreamingOptions) {
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [retryState, setRetryState] = React.useState<{
    attempt: number;
    countdown: number;
    message: string;
  } | null>(null);

  // Mounted ref to prevent state updates after unmount
  const isMountedRef = React.useRef(true);

  // Throttling refs for streaming performance
  const throttleTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const pendingContentRef = React.useRef<string>("");
  const lastUpdateTimeRef = React.useRef<number>(0);

  // AbortController for cancelling requests
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Retry countdown interval ref
  const retryIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
      }
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
      }
      // Abort any ongoing request on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
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

      // Start intent classification in parallel with streaming
      // This way we know the intent before streaming completes (no spinner flash)
      const intentPromise = aiService.classifyIntent(userMsg.content);

      // Create AbortController for this request
      abortControllerRef.current = new AbortController();

      await aiService.generateStream(
        {
          message: userMsg.content,
          context,
          history,
          isFirstMessage,
          attachments,
          mode,
        },
        {
          signal: abortControllerRef.current.signal,
          onRetry: (attempt, delayMs, errorMessage) => {
            if (!isMountedRef.current) return;

            // Add error message to conversation for tracking retry progression
            const errorMsgId = generateId();
            const errorMsg: Message = {
              id: errorMsgId,
              role: "error",
              content: errorMessage || "An error occurred. Retrying...",
              createdAt: Date.now(),
              actionData: null,
            };

            // Add error to messages
            setMessages((prev) => [...prev, errorMsg]);

            // Save error message to storage
            chatStorage.addMessage(conversationId, errorMsg).catch(console.error);

            // Clear any existing countdown interval
            if (retryIntervalRef.current) {
              clearInterval(retryIntervalRef.current);
            }

            // Start countdown
            const countdownSeconds = Math.ceil(delayMs / 1000);
            setRetryState({
              attempt,
              countdown: countdownSeconds,
              message: errorMessage || "",
            });

            retryIntervalRef.current = setInterval(() => {
              setRetryState((prev) => {
                if (!prev || prev.countdown <= 1) {
                  if (retryIntervalRef.current) {
                    clearInterval(retryIntervalRef.current);
                    retryIntervalRef.current = null;
                  }

                  // Add "Retried after Xs" message when countdown completes
                  if (prev) {
                    const retryMsgId = generateId();
                    const retryMsg: Message = {
                      id: retryMsgId,
                      role: "retry",
                      content: `Retried after ${countdownSeconds}s`,
                      createdAt: Date.now(),
                      actionData: null,
                    };

                    // Add retry message to UI
                    setMessages((msgs) => [...msgs, retryMsg]);

                    // Save retry message to storage
                    chatStorage.addMessage(conversationId, retryMsg).catch(console.error);
                  }

                  return null;
                }
                return { ...prev, countdown: prev.countdown - 1 };
              });
            }, 1000);
          },
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

            // Clear retry state on success
            setRetryState(null);
            if (retryIntervalRef.current) {
              clearInterval(retryIntervalRef.current);
              retryIntervalRef.current = null;
            }

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

            // Wait for intent classification (started in parallel with streaming)
            const intent = await intentPromise;
            console.log(`[useAIStreaming] User intent: "${intent}"`);

            // Only show preparing state if intent is "edit"
            const shouldPrepareActions = intent === "edit";

            // Update UI state - message is complete
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? {
                    ...assistantMsg,
                    isStreaming: false,
                    isPreparingActions: shouldPrepareActions,
                  }
                  : m
              )
            );
            setIsStreaming(false);

            // Only get CMS actions if the intent is "edit"
            if (intent === "edit") {
              // Get CMS actions from conversation - only send recent messages
              const recentMessages = [
                { role: "user", content: userMsg.content },
                { role: "assistant", content: fullText },
              ];

              try {
                const actions = await aiService.getCmsActions(
                  recentMessages,
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
                  // No actions detected even with edit intent, just save the message
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
            } else {
              // Intent is "question", skip CMS actions entirely
              console.log(
                "[useAIStreaming] Intent is 'question', skipping CMS actions"
              );
              await chatStorage.addMessage(conversationId, assistantMsg);
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

            // Clear retry state and countdown
            setRetryState(null);
            if (retryIntervalRef.current) {
              clearInterval(retryIntervalRef.current);
              retryIntervalRef.current = null;
            }

            // Clear any pending throttled updates
            if (throttleTimerRef.current) {
              clearTimeout(throttleTimerRef.current);
              throttleTimerRef.current = null;
            }

            // Reset throttle state
            pendingContentRef.current = "";
            lastUpdateTimeRef.current = 0;

            // Check if this is a cancellation - don't show error for cancellations
            if (
              error.message === "Request cancelled" ||
              abortControllerRef.current?.signal.aborted
            ) {
              // Save the partial message to history
              const partialMsg: Message = {
                id: assistantMsgId,
                role: "assistant",
                content: currentContent,
                createdAt: Date.now(),
                actionData: null,
              };
              chatStorage
                .addMessage(conversationId, partialMsg)
                .catch(console.error);

              // Keep the partial message visible but mark as not streaming
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, isStreaming: false } : m
                )
              );
            } else {
              // Add error message to conversation
              const errorMsgId = generateId();
              const errorMsg: Message = {
                id: errorMsgId,
                role: "error",
                content: error.userMessage || error.message,
                createdAt: Date.now(),
                actionData: null,
              };

              // Add error to messages
              setMessages((prev) => [
                ...prev.filter((m) => m.id !== assistantMsgId),
                errorMsg,
              ]);

              // Save error message to storage
              chatStorage.addMessage(conversationId, errorMsg).catch(console.error);
            }

            setIsStreaming(false);
          },
        }
      );
    } catch (error: any) {
      if (!isMountedRef.current) return;

      // Clear retry state
      setRetryState(null);
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
        retryIntervalRef.current = null;
      }

      // Check if this is a cancellation - don't show error for cancellations
      if (
        error.message === "Request cancelled" ||
        error.name === "AbortError"
      ) {
        // Save the partial message to history
        const partialMsg: Message = {
          id: assistantMsgId,
          role: "assistant",
          content: currentContent,
          createdAt: Date.now(),
          actionData: null,
        };
        chatStorage.addMessage(conversationId, partialMsg).catch(console.error);

        // Keep the partial message visible but mark as not streaming
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId ? { ...m, isStreaming: false } : m
          )
        );
      } else {
        // Add error message to conversation
        const errorMsgId = generateId();
        const errorMsg: Message = {
          id: errorMsgId,
          role: "error",
          content: error.userMessage || error.message || "An unexpected error occurred",
          createdAt: Date.now(),
          actionData: null,
        };

        // Add error to messages
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== assistantMsgId),
          errorMsg,
        ]);

        // Save error message to storage
        chatStorage.addMessage(conversationId, errorMsg).catch(console.error);
      }

      setIsStreaming(false);
    } finally {
      // Clean up the abort controller
      abortControllerRef.current = null;
    }
  };



  const cancelStreaming = React.useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    isStreaming,
    handleSubmit,
    cancelStreaming,
    retryState,
  };
}
